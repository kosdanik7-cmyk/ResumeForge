from __future__ import annotations

import asyncio
from typing import Any

import httpx
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models import SourceRecord, StructuredClaim

TRUSTED_ENDPOINTS = {
    "openalex": "https://api.openalex.org/works",
    "crossref": "https://api.crossref.org/works",
    "world_bank": "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL",
}


async def retrieve_sources(structured_claim: StructuredClaim) -> tuple[list[SourceRecord], list[dict[str, Any]]]:
    query = _build_semantic_query(structured_claim)
    retrieval_log: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=20.0) as client:
        openalex_task = _fetch_openalex(client, query)
        crossref_task = _fetch_crossref(client, query)
        results = await asyncio.gather(openalex_task, crossref_task, return_exceptions=True)

    sources: list[SourceRecord] = []
    for idx, result in enumerate(results):
        engine = "openalex" if idx == 0 else "crossref"
        if isinstance(result, Exception):
            retrieval_log.append({"engine": engine, "status": "error", "error": str(result)})
            continue
        retrieval_log.append({"engine": engine, "status": "ok", "count": len(result)})
        sources.extend(result)

    if not sources:
        retrieval_log.append({"engine": "all", "status": "no_trusted_sources"})
        return [], retrieval_log

    ranked = _rank_by_embedding_similarity(query, sources)
    retrieval_log.append({"engine": "embedding_ranker", "status": "ok", "count": len(ranked)})
    return ranked[:18], retrieval_log


def _build_semantic_query(claim: StructuredClaim) -> str:
    fragments = [claim.raw_text]
    for value in [
        claim.subject_entity,
        claim.object_entity,
        claim.relationship_type,
        claim.measurable_metric,
        claim.geographic_location,
        claim.time_window,
        claim.population_group,
        claim.directionality,
    ]:
        if value:
            fragments.append(str(value))
    if claim.directionality == "increase":
        fragments.append("no effect decrease negative association")
    elif claim.directionality == "decrease":
        fragments.append("increase no effect positive association")
    return " | ".join(fragments)


async def _fetch_openalex(client: httpx.AsyncClient, query: str) -> list[SourceRecord]:
    response = await client.get(TRUSTED_ENDPOINTS["openalex"], params={"search": query, "per-page": 12})
    response.raise_for_status()
    items = response.json().get("results", [])
    records: list[SourceRecord] = []
    for item in items:
        records.append(
            SourceRecord(
                id=f"openalex:{item.get('id', '')}",
                title=item.get("title") or "Untitled",
                publisher=(item.get("host_venue") or {}).get("display_name") or "OpenAlex",
                year=item.get("publication_year"),
                source_type=_classify_source_type((item.get("type") or "").lower()),
                abstract_or_snippet=_openalex_abstract(item)[:900],
                link=item.get("primary_location", {}).get("landing_page_url")
                or item.get("id", ""),
                doi=item.get("doi"),
            )
        )
    return records


async def _fetch_crossref(client: httpx.AsyncClient, query: str) -> list[SourceRecord]:
    response = await client.get(TRUSTED_ENDPOINTS["crossref"], params={"query": query, "rows": 12})
    response.raise_for_status()
    items = response.json().get("message", {}).get("items", [])
    records: list[SourceRecord] = []
    for item in items:
        year = None
        issued = item.get("issued", {}).get("date-parts", [])
        if issued and issued[0]:
            year = issued[0][0]
        records.append(
            SourceRecord(
                id=f"crossref:{item.get('DOI', item.get('URL', ''))}",
                title=(item.get("title") or ["Untitled"])[0],
                publisher=item.get("publisher", "Crossref"),
                year=year,
                source_type=_classify_source_type((item.get("type") or "").lower()),
                abstract_or_snippet=(item.get("abstract") or "Metadata match from Crossref registry.")[:900],
                link=item.get("URL", ""),
                doi=item.get("DOI"),
            )
        )
    return records


def _openalex_abstract(item: dict[str, Any]) -> str:
    inverted = item.get("abstract_inverted_index")
    if not inverted:
        return "No abstract available."
    pairs = []
    for word, positions in inverted.items():
        for pos in positions:
            pairs.append((pos, word))
    pairs.sort(key=lambda x: x[0])
    return " ".join(word for _, word in pairs)


def _rank_by_embedding_similarity(query: str, sources: list[SourceRecord]) -> list[SourceRecord]:
    corpus = [query] + [f"{s.title}. {s.abstract_or_snippet}" for s in sources]
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=2000)
    matrix = vectorizer.fit_transform(corpus)
    query_vec = matrix[0:1]
    doc_vecs = matrix[1:]
    sims = cosine_similarity(query_vec, doc_vecs).flatten()
    order = np.argsort(-sims)

    ranked = []
    for idx in order:
        source = sources[idx]
        source.score_breakdown["semantic_similarity"] = float(sims[idx] * 100)
        ranked.append(source)
    return ranked


def _classify_source_type(raw: str) -> str:
    if "meta" in raw or "review" in raw:
        return "systematic_review"
    if "journal" in raw or "article" in raw:
        return "peer_reviewed_article"
    if "dataset" in raw or "report" in raw:
        return "official_dataset"
    return "research_record"
