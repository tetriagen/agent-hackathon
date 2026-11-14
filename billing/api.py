"""Same-origin API and static UI. No document upload, database, or LLM call."""

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from billing.models import ReviewRequest, ReviewResult
from billing.rules import review_bill

ROOT = Path(__file__).resolve().parent.parent
app = FastAPI(title="ClearBill scaffold", version="0.1.0")


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
    return {"status": "ok", "mode": "confirmed_facts", "ai_enabled": False}


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
