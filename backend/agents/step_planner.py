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


_STEP_COUNTS = {"simple": "5-7", "moderate": "8-10", "complex": "11-14"}


async def plan_steps(profile: SubjectProfile) -> list[dict]:
    client = _get_client()
    step_count = _STEP_COUNTS.get(profile.complexity, "8-10")

    prompt = f"""You are a drawing teacher creating step-by-step instructions like a LEGO manual.

Subject: {profile.subject}
Description: {profile.description}
Complexity: {profile.complexity}
Main shapes: {", ".join(profile.main_shapes)}
Proportions: {profile.proportions}
Key details: {", ".join(profile.key_details)}

Create an ordered list of {step_count} drawing steps, from simplest foundation to final details.

Return ONLY a JSON array (no markdown):
[
  {{
    "step_number": 1,
    "title": "short step name",
    "base_instruction": "what to draw in this step, medium-agnostic"
  }}
]

Rules:
- Start with basic structure or gesture lines
- Build from large shapes to small details
- Each step produces visible, satisfying progress
- End with highlights or final touches"""

    message = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    return _parse_json(message.choices[0].message.content)
