from __future__ import annotations

import re
from app.models import StructuredClaim

CAUSAL_TRIGGERS = ["increase", "decrease", "cause", "raise", "reduce", "lead to", "impact", "affect"]
DIRECTION_TOKENS = {
    "increase": "increase",
    "increased": "increase",
    "rising": "increase",
    "rose": "increase",
    "decrease": "decrease",
    "decreased": "decrease",
    "fell": "decrease",
    "decline": "decrease",
    "no effect": "no_effect",
}


def parse_claim(text: str) -> StructuredClaim:
    lowered = text.lower().strip()
    claim_type = "causal" if any(token in lowered for token in CAUSAL_TRIGGERS) and "?" not in text else "descriptive"

    year_match = re.search(r"\b(19|20)\d{2}\b", text)
    location_match = re.search(r"\b(in|for|across)\s+([A-Z][a-zA-Z\s]+)", text)
    directionality = next((value for token, value in DIRECTION_TOKENS.items() if token in lowered), None)

    subject_entity = None
    object_entity = None
    relationship_type = "association"

    if claim_type == "causal":
        for splitter in [" increases ", " decreases ", " causes ", " leads to ", " affects "]:
            if splitter in lowered:
                left, right = lowered.split(splitter, 1)
                subject_entity = left.strip().title()
                object_entity = right.strip("?. ").title()
                relationship_type = "causal"
                break

    metric = _infer_metric(lowered)

    return StructuredClaim(
        raw_text=text,
        claim_type=claim_type,
        subject_entity=subject_entity,
        object_entity=object_entity,
        relationship_type=relationship_type,
        measurable_metric=metric,
        geographic_location=location_match.group(2).strip() if location_match else None,
        time_window=year_match.group(0) if year_match else None,
        population_group=_infer_population(lowered),
        directionality=directionality,
    )


def _infer_metric(text: str) -> str | None:
    common_metrics = [
        "crime", "inflation", "gdp", "unemployment", "mortality", "temperature", "education", "minimum wage",
        "poverty", "vaccination", "emissions", "population", "homicide", "income",
    ]
    for metric in common_metrics:
        if metric in text:
            return metric
    return None


def _infer_population(text: str) -> str | None:
    groups = ["children", "adults", "women", "men", "workers", "students", "elderly", "households"]
    for group in groups:
        if group in text:
            return group
    return None
