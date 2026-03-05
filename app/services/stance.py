from __future__ import annotations

import re
from app.models import SourceRecord, StructuredClaim

SUPPORT_TERMS = ["increase", "associated with", "significant effect", "higher", "positive effect", "rise"]
CONTRADICT_TERMS = ["no effect", "not associated", "decrease", "lower", "insignificant", "did not"]


def classify_stance(claim: StructuredClaim, sources: list[SourceRecord]) -> list[SourceRecord]:
    for source in sources:
        text = f"{source.title}. {source.abstract_or_snippet}".lower()
        source.quote = _extract_quote(source.abstract_or_snippet)
        support_hits = sum(term in text for term in SUPPORT_TERMS)
        contradict_hits = sum(term in text for term in CONTRADICT_TERMS)

        if claim.directionality == "increase":
            support_hits += int("increase" in text or "higher" in text)
            contradict_hits += int("decrease" in text or "no effect" in text)
        elif claim.directionality == "decrease":
            support_hits += int("decrease" in text or "lower" in text)
            contradict_hits += int("increase" in text)

        if support_hits and contradict_hits:
            source.stance = "mixed"
        elif support_hits > contradict_hits:
            source.stance = "supporting"
        elif contradict_hits > support_hits:
            source.stance = "contradicting"
        else:
            source.stance = "neutral"

        if not source.quote:
            source.stance = "neutral"
            source.quote = "No directly relevant excerpt available."

    return sources


def _extract_quote(text: str) -> str:
    if not text:
        return ""
    sentence_candidates = re.split(r"(?<=[.!?])\s+", text)
    for sentence in sentence_candidates:
        if len(sentence.split()) >= 8:
            return sentence.strip()[:400]
    return text[:280]
