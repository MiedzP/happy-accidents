from pydantic import BaseModel
from typing import List, Optional, Literal


class SubjectProfile(BaseModel):
    subject: str
    description: str
    complexity: str
    main_shapes: List[str]
    proportions: str
    color_palette: List[str]
    light_source: str
    shadow_areas: str
    key_details: List[str]
    suggested_simplifications: List[str]


class AnalyzeRequest(BaseModel):
    image_b64: str
    media_type: str = "image/jpeg"
    medium: str


class DrawingStep(BaseModel):
    step_number: int
    title: str
    instruction: str
    tip: Optional[str] = None
    image_url: Optional[str] = None
