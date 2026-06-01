from agents.llm import client, VISION_MODEL


async def analyze_image(image_b64: str, media_type: str) -> str:
    """Use the local vision model to describe the photo's subject for drawing.
    Returns a short free-text description (the text model turns it into a lesson).
    """
    resp = await client().chat.completions.create(
        model=VISION_MODEL,
        max_tokens=300,
        temperature=0.2,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{image_b64}"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Describe the main subject of this image for someone who "
                            "wants to draw it. In 2-4 sentences cover: what the subject "
                            "is, its main shapes and proportions, dominant colors, and "
                            "any key details. Be concrete and concise."
                        ),
                    },
                ],
            }
        ],
    )
    return (resp.choices[0].message.content or "").strip()
