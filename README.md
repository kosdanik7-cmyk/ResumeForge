# Veridex

Veridex is a professional claim-evaluation engine built around transparent evidence ranking instead of webpage ranking.

## Core principles

- Structured claim parsing before retrieval.
- Trusted-source-first semantic retrieval (OpenAlex + Crossref in this build).
- Explicit stance labels with quoted evidence snippets.
- Rule-based evidence strength scoring (0-100) with visible breakdown.
- Verdict policy constrained to: True, False, Misleading, Mixed Evidence, Unverifiable.
- Hard integrity guardrail: no trustworthy evidence => Unverifiable.
- Full audit logging of structured claim, retrieval decisions, and final verdict.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000.
