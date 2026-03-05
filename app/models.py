from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class StructuredClaim:
    raw_text: str
    claim_type: str
    subject_entity: str | None = None
    object_entity: str | None = None
    relationship_type: str | None = None
    measurable_metric: str | None = None
    geographic_location: str | None = None
    time_window: str | None = None
    population_group: str | None = None
    directionality: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "claim_type": self.claim_type,
            "subject_entity": self.subject_entity,
            "object_entity": self.object_entity,
            "relationship_type": self.relationship_type,
            "measurable_metric": self.measurable_metric,
            "geographic_location": self.geographic_location,
            "time_window": self.time_window,
            "population_group": self.population_group,
            "directionality": self.directionality,
        }


@dataclass
class SourceRecord:
    id: str
    title: str
    publisher: str
    year: int | None
    source_type: str
    abstract_or_snippet: str
    link: str
    doi: str | None = None
    geography: str | None = None
    metric: str | None = None
    stance: str = "neutral"
    quote: str = ""
    score: float = 0.0
    score_breakdown: dict[str, float] = field(default_factory=dict)
    inclusion_reason: str = "used"


@dataclass
class VerdictResult:
    verdict: str
    confidence: float
    concise_answer: str
    support_score: float
    contradict_score: float
    mixed_score: float
    sources_used: list[SourceRecord]
    excluded_sources: list[SourceRecord]
    structured_claim: StructuredClaim
    retrieval_log: list[dict[str, Any]]
