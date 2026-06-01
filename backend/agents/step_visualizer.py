import asyncio
import io
import os
import uuid
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps

# Step reference images are derived FROM the user's uploaded photo: each step is
# the photo rendered in the chosen medium, built up from a rough early stage to a
# finished drawing — so following the steps reconstructs their actual image.
# Done locally with Pillow: faithful, fast, free, no external service.

STATIC_DIR = Path(__file__).resolve().parent.parent / "static" / "steps"
_ENABLED = os.environ.get("IMAGES_ENABLED", "1") != "0"
_MAX = 768


def _load(image_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((_MAX, _MAX))
    return img


def _dodge(gray: Image.Image, blur: Image.Image) -> Image.Image:
    a = np.asarray(gray, dtype=np.float32)
    b = np.asarray(blur, dtype=np.float32)
    out = a * 255.0 / (255.0 - b + 1.0)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode="L")


def _pencil(gray: Image.Image) -> Image.Image:
    """Classic grayscale pencil-sketch: white paper with soft graphite lines."""
    inv = ImageOps.invert(gray)
    blur = inv.filter(ImageFilter.GaussianBlur(12))
    return _dodge(gray, blur)


def _styled(img: Image.Image, medium: str) -> Image.Image:
    """The *finished* look of the drawing in the given medium."""
    gray = img.convert("L")

    if medium == "charcoal":
        sk = _pencil(gray)
        sk = ImageEnhance.Contrast(sk).enhance(1.35)
        return ImageEnhance.Brightness(sk).enhance(0.9).convert("RGB")

    if medium == "ink":
        sk = _pencil(gray)
        return sk.point(lambda x: 255 if x > 112 else 0).convert("RGB")

    if medium == "watercolor":
        base = img.filter(ImageFilter.GaussianBlur(1.5)).filter(ImageFilter.SMOOTH_MORE)
        base = ImageEnhance.Color(base).enhance(0.9)
        return ImageEnhance.Brightness(base).enhance(1.08)

    if medium in ("acrylic", "oil"):
        bits = 2 if medium == "oil" else 3  # oil = chunkier colour blocks
        post = ImageOps.posterize(img, bits).filter(ImageFilter.MedianFilter(3))
        return post.filter(ImageFilter.SMOOTH_MORE) if medium == "oil" else post

    if medium in ("colored_pencil", "pastel"):
        color = ImageEnhance.Color(img).enhance(0.85 if medium == "pastel" else 1.0)
        color = color.filter(ImageFilter.GaussianBlur(1.2 if medium == "pastel" else 0.6))
        if medium == "pastel":
            color = ImageEnhance.Brightness(color).enhance(1.1)
        lines = _pencil(gray).convert("RGB")
        return ImageChops.multiply(color, lines)

    if medium == "digital":
        d = ImageEnhance.Color(img).enhance(1.1)
        return d.filter(ImageFilter.EDGE_ENHANCE)

    # pencil / colored_pencil default / anything else -> graphite sketch
    if medium == "colored_pencil":
        pass
    return _pencil(gray).convert("RGB")


def _progressive(styled: Image.Image, p: float) -> Image.Image:
    """Render the drawing at progress p (0=first step rough, 1=last step finished):
    early steps are softer and lighter (blocking in), later steps sharp and full."""
    radius = 6.0 * (1.0 - p)
    out = styled.filter(ImageFilter.GaussianBlur(radius)) if radius > 0.15 else styled
    out = ImageEnhance.Brightness(out).enhance(1.0 + 0.22 * (1.0 - p))
    out = ImageEnhance.Contrast(out).enhance(0.72 + 0.28 * p)
    return out.convert("RGB")


def _render_all_sync(image_bytes: bytes, medium: str, n: int) -> list[str]:
    img = _load(image_bytes)
    styled = _styled(img, medium)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    urls: list[str] = []
    for i in range(n):
        p = i / (n - 1) if n > 1 else 1.0
        out = _progressive(styled, p)
        filename = f"{uuid.uuid4().hex}.png"
        out.save(STATIC_DIR / filename, "PNG", optimize=True)
        urls.append(f"static/steps/{filename}")  # main.py -> absolute URL
    return urls


async def visualize_steps(
    steps: list[dict],
    subject: str = "the subject",
    medium: str = "",
    image_bytes: bytes | None = None,
) -> list[dict]:
    if not _ENABLED or not image_bytes or not steps:
        for step in steps:
            step["image_url"] = None
        return steps
    try:
        urls = await asyncio.to_thread(
            _render_all_sync, image_bytes, medium, len(steps)
        )
        for step, url in zip(steps, urls):
            step["image_url"] = url
    except Exception as exc:
        print(f"[step_visualizer] render failed: {exc}")
        for step in steps:
            step["image_url"] = None
    return steps
