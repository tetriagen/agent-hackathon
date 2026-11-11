import json
import os
import re
import time

LOG_PATH = "logs/audit.jsonl"
MAX_OUTPUT_CHARS = 4000
SECRET_RE = re.compile(r"(sk-[A-Za-z0-9_\-]{10,}|api[_-]?key\s*[=:]\s*\S+)", re.I)


def redact(text: str) -> str:
    return SECRET_RE.sub("[REDACTED]", text)


def check_call(tool: dict, args: dict, approved: bool) -> tuple[bool, str]:
    """Return (allowed, reason). Risky tools need explicit approval."""
    if tool.get("risky") and not approved:
        return False, "Approval required: ask the user to approve this action."
    return True, "ok"


def clip(output: str) -> str:
    output = redact(str(output))
    if len(output) > MAX_OUTPUT_CHARS:
        return output[:MAX_OUTPUT_CHARS] + "\n...[truncated]"
    return output


def log_call(name: str, args: dict, allowed: bool, result: str) -> dict:
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    entry = {
        "ts": time.strftime("%Y-%m-%d %H:%M:%S"),
        "tool": name,
        "input": json.loads(redact(json.dumps(args, ensure_ascii=False))),
        "allowed": allowed,
        "result": result[:500],
    }
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry
