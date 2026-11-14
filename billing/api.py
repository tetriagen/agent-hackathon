"""Local rules plus explicitly opted-in remote PDF extraction."""

import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from openai import APIError, AuthenticationError, RateLimitError
from pydantic import ValidationError

from billing.extraction import (
    RemoteExtractionError,
    configured,
    extract_pdf,
    selected_provider,
    settings,
    validate_pdf,
)
from billing.models import ReviewRequest, ReviewResult
from billing.rules import review_bill

ROOT = Path(__file__).resolve().parent.parent
app = FastAPI(title="ClearBill scaffold", version="0.1.0")
ai_lock = asyncio.Lock()
ai_requests = 0


@app.middleware("http")
async def privacy_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; "
        "connect-src 'self'; worker-src 'self' blob:; "
        "img-src 'self' blob: data:; font-src 'self' blob:; "
        "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    )
    return response


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "mode": "confirmed_facts",
        "ai_provider": selected_provider(settings()),
        "ai_enabled": configured(settings()),
    }


@app.post("/api/extract")
async def extract(request: Request):
    global ai_requests
    if request.headers.get("x-ai-consent") != "send-original-pdf":
        raise HTTPException(
            400, "Confirm sending the original PDF to the selected AI provider."
        )
    if request.headers.get("content-type") != "application/pdf":
        raise HTTPException(415, "Choose a PDF file.")
    config = settings()
    if request.headers.get("x-ai-provider") != selected_provider(config):
        raise HTTPException(
            409, "AI provider changed. Reload the page and review data-sharing consent."
        )
    if not configured(config):
        raise HTTPException(
            503, "AI is not configured on this server. Local rules still work."
        )
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 10 * 1024 * 1024:
            raise HTTPException(413, "Choose a PDF up to 10 MB.")
    try:
        pages = await asyncio.to_thread(validate_pdf, bytes(body))
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    if ai_lock.locked():
        raise HTTPException(429, "Another AI request is running. Try again shortly.")
    async with ai_lock:
        try:
            limit = max(0, min(100, int(config["CLEARBILL_AI_MAX_REQUESTS"])))
        except ValueError:
            raise HTTPException(
                503, "Invalid server AI request limit configuration."
            ) from None
        if ai_requests >= limit:
            raise HTTPException(
                429,
                "This server's demo AI request limit is reached. Local rules still work.",
            )
        ai_requests += 1
        try:
            return await extract_pdf(bytes(body), pages)
        except RemoteExtractionError as error:
            raise HTTPException(error.status, str(error)) from None
        except AuthenticationError:
            raise HTTPException(
                503, "The server API key was rejected. Check its configuration."
            ) from None
        except RateLimitError as error:
            if error.code == "credit_balance_exhausted":
                raise HTTPException(
                    429,
                    "OpenAI API credits are exhausted. Add credits in API billing; local rules still work.",
                ) from None
            raise HTTPException(
                429,
                "OpenAI quota or rate limit reached. Check API billing or try later.",
            ) from None
        except (APIError, ValueError):
            # Never echo provider error bodies or document text.
            raise HTTPException(
                502,
                "AI extraction failed or returned incomplete fields. Local rules still work.",
            ) from None


@app.post("/api/review", response_model=ReviewResult)
async def review(request: Request):
    if request.headers.get("content-type", "").split(";")[0] != "application/json":
        raise HTTPException(415, "Send JSON containing confirmed facts only.")
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 8192:
            raise HTTPException(413, "Request too large. Send confirmed facts only.")
    try:
        facts = ReviewRequest.model_validate_json(bytes(body))
    except ValidationError:
        # Do not echo rejected fields or values back into logs or responses.
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Check amounts and answers. Only the documented fact fields are accepted."
            },
        )
    return review_bill(facts)


vendor = ROOT / "node_modules" / "pdfjs-dist" / "build"
if vendor.is_dir():
    app.mount("/vendor/pdfjs", StaticFiles(directory=vendor), name="pdfjs")
for route, path in {
    "tesseract": "tesseract.js/dist",
    "tesseract-core": "tesseract.js-core",
    "tessdata": "@tesseract.js-data/eng/4.0.0",
}.items():
    directory = ROOT / "node_modules" / path
    if directory.is_dir():
        app.mount(f"/vendor/{route}", StaticFiles(directory=directory), name=route)
app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
