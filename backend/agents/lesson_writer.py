from agents.llm import chat_json

# Consolidated into ONE text call (planning + medium adaptation) — important for
# CPU-only Ollama, where each generation is slow.

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


async def write_lesson(description: str, medium: str) -> dict:
    medium_context = MEDIUM_CONTEXTS.get(medium, medium)
    medium_label = medium.replace("_", " ")

    prompt = f"""You are a friendly drawing teacher. Using the photo description below, \
write a step-by-step drawing lesson for {medium_label}.

Photo description: {description}

Medium technique notes: {medium_context}

Return ONLY a JSON object with exactly this shape:
{{
  "subject": "short name of the main subject (2-4 words)",
  "description": "one friendly sentence about what we'll draw",
  "steps": [
    {{
      "step_number": 1,
      "title": "short step name",
      "instruction": "what to do in this step, specific to {medium_label} (1-3 sentences)",
      "tip": "a short practical tip, or null"
    }}
  ]
}}

Rules:
- Exactly 6 to 7 steps, ordered from basic construction shapes to final details.
- Every instruction uses real {medium_label} techniques and tools.
- Keep it beginner-friendly and concise."""

    return await chat_json(
        [{"role": "user", "content": prompt}], max_tokens=2048, temperature=0.5
    )
