"""Shared LLM client + robust JSON helpers.

Provider-agnostic: points at Ollama (local) by default, but everything is driven
by env vars, so switching back to Groq is just changing LLM_BASE_URL / models.
"""
import json
import os
import re

from openai import AsyncOpenAI

BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:11434/v1")
API_KEY = os.environ.get("LLM_API_KEY", "ollama")
TEXT_MODEL = os.environ.get("LLM_TEXT_MODEL", "qwen2.5:3b")
VISION_MODEL = os.environ.get("LLM_VISION_MODEL", "moondream")

_client: AsyncOpenAI | None = None


def client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(base_url=BASE_URL, api_key=API_KEY)
    return _client


_FENCE = re.compile(r"```[a-zA-Z]*")


def extract_json(text: str):
    """Tolerantly pull a JSON value out of an LLM response (handles code fences
    and surrounding prose)."""
    if not text:
        raise ValueError("empty model response")
    t = _FENCE.sub("", text).replace("```", "").strip()
    try:
        return json.loads(t)
    except Exception:
        pass
    # Fall back to the largest {...} or [...] span.
    candidates = []
    for open_c, close_c in (("{", "}"), ("[", "]")):
        start, end = t.find(open_c), t.rfind(close_c)
        if start != -1 and end > start:
            candidates.append(t[start : end + 1])
    for c in sorted(candidates, key=len, reverse=True):
        try:
            return json.loads(c)
        except Exception:
            continue
    raise ValueError(f"no valid JSON found in response: {text[:200]!r}")


async def chat_json(
    messages: list,
    *,
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.4,
    retries: int = 2,
) -> dict | list:
    """Chat completion that returns parsed JSON, using JSON mode and retrying with
    a corrective nudge if the model returns something unparseable."""
    model = model or TEXT_MODEL
    msgs = list(messages)
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        resp = await client().chat.completions.create(
            model=model,
            messages=msgs,
            max_tokens=max_tokens,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content
        try:
            return extract_json(content or "")
        except Exception as exc:
            last_err = exc
            msgs = list(messages) + [
                {"role": "assistant", "content": content or ""},
                {
                    "role": "user",
                    "content": "That was not valid JSON. Reply with ONLY the JSON object, nothing else.",
                },
            ]
    raise last_err  # type: ignore[misc]
