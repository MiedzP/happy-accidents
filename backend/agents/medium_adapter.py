import json
import os
from openai import AsyncOpenAI
from models import SubjectProfile

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=os.environ["GROQ_API_KEY"],
            base_url="https://api.groq.com/openai/v1",
        )
    return _client


def _parse_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return json.loads(text)


MEDIUM_CONTEXTS = {
    "pencil": "graphite pencil on paper — focus on line weight, hatching for shading, and pressure control",
    "colored_pencil": "colored pencils — focus on layering colors, burnishing, and pressure for saturation",
    "watercolor": "watercolor on watercolor paper — focus on wet-on-wet vs wet-on-dry, washes, and working light to dark",
    "acrylic": "acrylic paint on canvas or board — focus on blocking in, layering, and blending while wet",
    "oil": "oil paint on canvas — focus on underpainting, fat-over-lean rule, and wet-on-wet blending",
    "charcoal": "charcoal on paper — focus on broad strokes, blending with fingers or a stump, and using an eraser as a drawing tool",
    "ink": "ink pen or brush — focus on line confidence, crosshatching for tone, and commitment (no erasing)",
    "digital": "digital painting — focus on layers, brush opacity, and non-destructive workflow",
    "pastel": "soft pastels on toned paper — focus on layering, blending, and working on colored ground",
}


async def adapt_for_medium(
    steps: list[dict], medium: str, profile: SubjectProfile
) -> list[dict]:
    client = _get_client()
    medium_context = MEDIUM_CONTEXTS.get(medium, medium)

    prompt = f"""You are an expert art teacher adapting drawing instructions for a specific medium.

Subject: {profile.subject}
Medium: {medium_context}
Color palette: {", ".join(profile.color_palette)}
Light source: {profile.light_source}

Base drawing steps to adapt:
{json.dumps(steps, indent=2)}

Rewrite each step with specific {medium} techniques, tools, and advice.
Include practical details: brush size, pencil grade, water ratio, layer order, etc.

Return ONLY a JSON array (no markdown):
[
  {{
    "step_number": 1,
    "title": "same title as input",
    "instruction": "detailed medium-specific instruction for this step",
    "tip": "a practical pro tip for {medium} at this step, or null if nothing critical"
  }}
]"""

    message = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    return _parse_json(message.choices[0].message.content)
