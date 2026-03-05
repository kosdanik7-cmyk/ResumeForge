from __future__ import annotations

import asyncio
from dataclasses import asdict

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.services.pipeline import init_audit_db, run_pipeline

app = FastAPI(title="Veridex", version="0.1.0")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")


@app.on_event("startup")
async def startup() -> None:
    init_audit_db()


@app.get("/", response_class=HTMLResponse)
async def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/evaluate")
async def evaluate(claim: str = Form(...)) -> JSONResponse:
    await asyncio.sleep(0.2)
    result = await run_pipeline(claim)
    payload = asdict(result)
    payload["structured_claim"] = result.structured_claim.as_dict()
    return JSONResponse(payload)
