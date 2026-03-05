from __future__ import annotations

from datetime import datetime

from app.models import SourceRecord, StructuredClaim, VerdictResult

SOURCE_TYPE_WEIGHT = {
    "systematic_review": 30,
    "peer_reviewed_article": 24,
    "official_dataset": 28,
    "research_record": 18,
}

CREDIBILITY_WEIGHT = {
    "Nature": 30,
    "Science": 30,
    "OpenAlex": 20,
    "Crossref": 18,
    "World Bank": 28,
    "OECD": 28,
    "CDC": 28,
}


def score_and_verdict(claim: StructuredClaim, sources: list[SourceRecord], retrieval_log: list[dict]) -> VerdictResult:
    now_year = datetime.utcnow().year
    used: list[SourceRecord] = []
    excluded: list[SourceRecord] = []

    for source in sources:
        breakdown = source.score_breakdown
        breakdown["methodology"] = SOURCE_TYPE_WEIGHT.get(source.source_type, 15)
        breakdown["credibility"] = _credibility_score(source.publisher)
        breakdown["recency"] = _recency_score(source.year, claim.time_window, now_year)
        breakdown["directness"] = _directness_score(claim, source)
        breakdown["stance_clarity"] = 10 if source.stance in {"supporting", "contradicting", "mixed"} else 4

        total = sum(breakdown.values())
        source.score = max(0.0, min(100.0, total / 1.3))

        if source.score >= 30 and source.stance != "neutral" and source.quote:
            source.inclusion_reason = "used"
            used.append(source)
        else:
            source.inclusion_reason = _exclusion_reason(source)
            excluded.append(source)

    support_score = sum(s.score for s in used if s.stance == "supporting")
    contradict_score = sum(s.score for s in used if s.stance == "contradicting")
    mixed_score = sum(s.score for s in used if s.stance == "mixed")

    verdict, confidence = _decide_verdict(support_score, contradict_score, mixed_score, len(used))
    answer = _compose_answer(verdict, confidence, claim, used)

    if not used:
        verdict = "Unverifiable"
        confidence = 0.2
        answer = "High-trust sources directly addressing this structured claim were not found in this run. Veridex returns Unverifiable by policy."

    return VerdictResult(
        verdict=verdict,
        confidence=confidence,
        concise_answer=answer,
        support_score=support_score,
        contradict_score=contradict_score,
        mixed_score=mixed_score,
        sources_used=sorted(used, key=lambda x: x.score, reverse=True),
        excluded_sources=sorted(excluded, key=lambda x: x.score, reverse=True),
        structured_claim=claim,
        retrieval_log=retrieval_log,
    )


def _credibility_score(publisher: str) -> float:
    for key, value in CREDIBILITY_WEIGHT.items():
        if key.lower() in publisher.lower():
            return float(value)
    return 16.0


def _recency_score(year: int | None, claim_time: str | None, now_year: int) -> float:
    if not year:
        return 8.0
    if claim_time and claim_time.isdigit():
        distance = abs(int(claim_time) - year)
    else:
        distance = abs(now_year - year)
    if distance <= 1:
        return 20.0
    if distance <= 5:
        return 15.0
    if distance <= 10:
        return 10.0
    return 5.0


def _directness_score(claim: StructuredClaim, source: SourceRecord) -> float:
    text = f"{source.title} {source.abstract_or_snippet}".lower()
    score = 8.0
    for token in [claim.measurable_metric, claim.geographic_location, claim.population_group, claim.time_window]:
        if token and str(token).lower() in text:
            score += 6.0
    return min(score, 30.0)


def _exclusion_reason(source: SourceRecord) -> str:
    if source.stance == "neutral":
        return "excluded: no direct stance evidence"
    if source.score < 30:
        return "excluded: insufficient evidence strength"
    return "excluded: insufficient relevance"


def _decide_verdict(support: float, contradict: float, mixed: float, used_count: int) -> tuple[str, float]:
    total = support + contradict + mixed
    if used_count == 0 or total < 40:
        return "Unverifiable", 0.2
    if mixed > 0.35 * total:
        return "Mixed Evidence", min(0.75, total / 220)
    margin = support - contradict
    if margin > 35:
        return "True", min(0.95, 0.55 + margin / max(total, 1))
    if margin < -35:
        return "False", min(0.95, 0.55 + abs(margin) / max(total, 1))
    return "Misleading", min(0.85, 0.5 + abs(margin) / max(total, 1))


def _compose_answer(verdict: str, confidence: float, claim: StructuredClaim, sources: list[SourceRecord]) -> str:
    if not sources:
        return "No answer is generated because no directly relevant high-trust evidence was retrieved."
    top = sources[:2]
    cites = "; ".join(f"{s.publisher} ({s.year or 'n.d.'})" for s in top)
    metric = claim.measurable_metric or "the claim metric"
    return (
        f"Verdict: {verdict}. Evidence for {metric} is derived from top-ranked sources with confidence {confidence:.0%}. "
        f"Most influential evidence in this run comes from {cites}, and all statements are constrained to retrieved excerpts."
    )
