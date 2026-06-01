import base64
import os
from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from agents.image_analysis import analyze_image
from agents.lesson_writer import write_lesson
from agents.step_visualizer import visualize_steps

SUPPORTED_MEDIUMS = [
    "pencil", "colored_pencil", "watercolor", "acrylic",
    "oil", "charcoal", "ink", "digital", "pastel",
]

app = FastAPI(title="Drawing Teacher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Generated step images are written here and served back as URLs.
STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/mediums")
def get_mediums():
    return {"mediums": SUPPORTED_MEDIUMS}


@app.post("/analyze")
async def analyze(
    request: Request,
    image: UploadFile = File(...),
    medium: str = Form(...),
):
    if medium not in SUPPORTED_MEDIUMS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported medium. Choose from: {SUPPORTED_MEDIUMS}",
        )

    image_data = await image.read()
    if not image_data:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image was empty. Please pick a photo and try again.",
        )

    media_type = image.content_type or "image/jpeg"
    if not media_type.startswith("image/"):
        # Common image magic bytes, so a wrong/missing content-type still works.
        if image_data[:3] == b"\xff\xd8\xff":
            media_type = "image/jpeg"
        elif image_data[:8] == b"\x89PNG\r\n\x1a\n":
            media_type = "image/png"
        else:
            raise HTTPException(
                status_code=400,
                detail="That file doesn't look like an image. Please pick a JPEG or PNG photo.",
            )

    image_b64 = base64.b64encode(image_data).decode()

    try:
        description = await analyze_image(image_b64, media_type)
        lesson = await write_lesson(description, medium)
    except HTTPException:
        raise
    except Exception as exc:
        # Turn upstream (model) failures into a clear, displayable message.
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't generate the lesson — the AI model errored: {exc}",
        )

    subject = (lesson.get("subject") or "your subject").strip()
    subj_description = (lesson.get("description") or description or "").strip()
    raw_steps = lesson.get("steps") or []

    # Normalize steps (models can omit/mis-shape fields).
    steps = []
    for i, s in enumerate(raw_steps):
        if not isinstance(s, dict):
            continue
        tip = s.get("tip")
        if isinstance(tip, str) and tip.strip().lower() in ("", "null", "none"):
            tip = None
        steps.append(
            {
                "step_number": i + 1,
                "title": str(s.get("title") or f"Step {i + 1}"),
                "instruction": str(s.get("instruction") or "").strip(),
                "tip": tip,
            }
        )
    if not steps:
        raise HTTPException(
            status_code=502,
            detail="The AI model didn't return any drawing steps. Please try again.",
        )

    final_steps = await visualize_steps(steps, subject, medium, image_data)

    # Turn relative /static refs into absolute URLs on the same host the client
    # called (so a phone on the LAN can load them).
    base_url = str(request.base_url).rstrip("/")
    for step in final_steps:
        rel = step.get("image_url")
        if rel and not rel.startswith("http"):
            step["image_url"] = f"{base_url}/{rel.lstrip('/')}"

    return {
        "subject": {"subject": subject, "description": subj_description},
        "medium": medium,
        "steps": final_steps,
    }
