from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from app.models import VerdictResult
from app.services.claim_parser import parse_claim
from app.services.retrieval import retrieve_sources
from app.services.scoring import score_and_verdict
from app.services.stance import classify_stance

DB_PATH = Path("veridex_audit.db")


def init_audit_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            claim TEXT NOT NULL,
            structured_claim TEXT NOT NULL,
            retrieval_log TEXT NOT NULL,
            verdict TEXT NOT NULL,
            confidence REAL NOT NULL,
            source_count INTEGER NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


async def run_pipeline(claim_text: str) -> VerdictResult:
    structured = parse_claim(claim_text)
    sources, retrieval_log = await retrieve_sources(structured)
    sources = classify_stance(structured, sources)
    result = score_and_verdict(structured, sources, retrieval_log)
    _write_audit_entry(claim_text, result)
    return result


def _write_audit_entry(claim_text: str, result: VerdictResult) -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        INSERT INTO audit_log (claim, structured_claim, retrieval_log, verdict, confidence, source_count)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            claim_text,
            json.dumps(result.structured_claim.as_dict()),
            json.dumps(result.retrieval_log),
            result.verdict,
            result.confidence,
            len(result.sources_used),
        ),
    )
    conn.commit()
    conn.close()
