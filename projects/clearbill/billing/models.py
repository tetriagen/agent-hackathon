"""Only allow confirmed facts across the browser/server boundary."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    estimate_amount: str = Field(pattern=r"^\d{1,8}(\.\d{1,2})?$")
    billed_amount: str = Field(pattern=r"^\d{1,8}(\.\d{1,2})?$")
    payment_type: Literal["self_pay", "insurance", "unknown"] = "unknown"
    same_provider: bool | None = None
    estimate_received: bool | None = None
    within_120_days: bool | None = None


class ReviewResult(BaseModel):
    status: Literal[
        "needs_information", "review_recommended", "outside_scope", "below_threshold"
    ]
    estimate_amount: str
    billed_amount: str
    difference: str
    title: str
    explanation: str
    next_steps: list[str]
    source_url: str
    limitation: str
