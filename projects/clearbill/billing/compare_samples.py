"""Explicit remote sample run: python -m billing.compare_samples PDF_DIR OUTPUT_JSON.

Reads only the five public sample filenames in pdf-expected.json. Does not retry
failed model calls, stops on any failed request, and saves after every response.
Never includes an API key, raw PDF, or provider error body in the report.
"""

import argparse
import json
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent


def score(fields, expected):
    return {
        key: {
            "expected": value,
            "actual": fields[key]["value"],
            "correct": fields[key]["value"] == value,
        }
        for key, value in expected.items()
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf_dir", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--server", default="http://127.0.0.1:8012")
    args = parser.parse_args()
    expected = json.loads((ROOT / "tests/fixtures/pdf-expected.json").read_text())
    baseline = {
        r["file"]: r
        for r in json.loads((ROOT / "docs/PDF-TEST-RESULTS.json").read_text())[
            "results"
        ]
    }
    report = {
        "method": "Five-sample compatibility comparison. Local rules use browser PDF.js/OCR text; AI receives original PDFs. Not an equal-input parser benchmark or general accuracy estimate.",
        "status": "running",
        "samples": [],
    }
    with httpx.Client(timeout=125, trust_env=False) as client:
        health = client.get(args.server.rstrip("/") + "/api/health").json()
        provider = health["ai_provider"]
        report["provider"] = provider
        for sample in expected["samples"]:
            name = sample["file"]
            response = client.post(
                args.server.rstrip("/") + "/api/extract",
                content=(args.pdf_dir / name).read_bytes(),
                headers={
                    "Content-Type": "application/pdf",
                    "X-AI-Consent": "send-original-pdf",
                    "X-AI-Provider": provider,
                },
            )
            row = {
                "file": name,
                "expected_type": sample["type"],
                "local": score(baseline[name]["fields"], sample["fields"]),
                "http_status": response.status_code,
            }
            if response.status_code == 200:
                result = response.json()
                row.update(
                    {
                        "ai_result": result,
                        "ai": score(result["extraction"]["fields"], sample["fields"]),
                        "ai_type_correct": result["extraction"]["type"]
                        == sample["type"],
                    }
                )
            else:
                row["ai"] = None
                row["note"] = (
                    "No model result; request failed. This is not an extraction error score."
                )
            report["samples"].append(row)
            report["status"] = "blocked" if response.status_code != 200 else "running"
            args.output.write_text(json.dumps(report, indent=2) + "\n")
            print(f"{name}: HTTP {response.status_code}", flush=True)
            if report["status"] == "blocked":
                break
        else:
            report["status"] = (
                "completed"
                if all(r["http_status"] == 200 for r in report["samples"])
                else "partial"
            )
            args.output.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
