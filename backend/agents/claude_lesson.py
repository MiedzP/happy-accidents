import os

from anthropic import AsyncAnthropic

# One Claude call does it all: it actually looks at the photo and writes a lesson
# that matches THIS image. Structured output is guaranteed via a forced tool call.

MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

_client: AsyncAnthropic | None = None


def client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


MEDIUM_CONTEXTS = {
    "pencil": "graphite pencil on paper — line weight, hatching for shading, pressure control",
    "colored_pencil": "colored pencils — layering colors, burnishing, pressure for saturation",
    "watercolor": "watercolor on paper — wet-on-wet vs wet-on-dry, washes, working light to dark",
    "acrylic": "acrylic paint — blocking in, layering, blending while wet",
    "oil": "oil paint on canvas — underpainting, fat-over-lean, wet-on-wet blending",
    "charcoal": "charcoal on paper — broad strokes, blending with a stump, eraser as a drawing tool",
    "ink": "ink pen or brush — confident lines, crosshatching for tone, no erasing",
    "digital": "digital painting — layers, brush opacity, non-destructive workflow",
    "pastel": "soft pastels on toned paper — layering, blending, working on colored ground",
}

LESSON_TOOL = {
    "name": "create_lesson",
    "description": "Return the step-by-step drawing lesson for the photo.",
    "input_schema": {
        "type": "object",
        "properties": {
            "subject": {
                "type": "string",
                "description": "Short name of the actual main subject in the photo (2-4 words).",
            },
            "description": {
                "type": "string",
                "description": "One friendly sentence describing what we'll draw.",
            },
            "steps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "instruction": {"type": "string"},
                        "tip": {
                            "type": "string",
                            "description": "A short practical tip (omit if none).",
                        },
                    },
                    "required": ["title", "instruction"],
                },
            },
        },
        "required": ["subject", "description", "steps"],
    },
}


async def make_lesson(image_b64: str, media_type: str, medium: str) -> dict:
    medium_label = medium.replace("_", " ")
    ctx = MEDIUM_CONTEXTS.get(medium, medium_label)

    prompt = (
        f"Look carefully at this photo and identify what is ACTUALLY in it. Create a "
        f"beginner {medium_label} drawing lesson that teaches someone to draw THIS "
        f"specific image, so that following the steps reconstructs this exact photo.\n\n"
        f"Medium technique notes: {ctx}\n\n"
        f"Make 6 to 7 steps, ordered from basic construction shapes to final details. "
        f"Every instruction must use real {medium_label} techniques and tools, and must "
        f"match the real subject, composition, colors, and lighting visible in the photo. "
        f"Do not invent objects that aren't in the image. Call the create_lesson tool."
    )

    msg = await client().messages.create(
        model=MODEL,
        max_tokens=2000,
        tools=[LESSON_TOOL],
        tool_choice={"type": "tool", "name": "create_lesson"},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    for block in msg.content:
        if block.type == "tool_use":
            return block.input
    raise ValueError("Claude did not return a lesson.")
