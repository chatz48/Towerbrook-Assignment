from __future__ import annotations

from pydantic import BaseModel, Field


class CopilotSynthesis(BaseModel):
    answer_summary: str
    key_findings: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    follow_ups: list[str] = Field(default_factory=list)
    uncertainty_notes: str = ""
