import json

import pytest

from agent import guard


@pytest.mark.parametrize("approved", [False, True])
def test_risky_tool_requires_approval(approved):
    allowed, reason = guard.check_call({"risky": True}, {}, approved)
    assert allowed is approved
    assert reason == ("ok" if approved else "Approval required: ask the user to approve this action.")


def test_read_only_tool_does_not_require_approval():
    assert guard.check_call({"risky": False}, {}, False) == (True, "ok")


def test_redact_hides_key_and_preserves_surrounding_text():
    fake_key = "sk-" + "not_a_real_key_1234567890"
    assert guard.redact(f"before {fake_key} after") == "before [REDACTED] after"


def test_clip_truncates_long_output():
    result = guard.clip("x" * (guard.MAX_OUTPUT_CHARS + 10))
    assert result == "x" * guard.MAX_OUTPUT_CHARS + "\n...[truncated]"


def test_clip_keeps_output_at_limit():
    assert guard.clip("x" * guard.MAX_OUTPUT_CHARS) == "x" * guard.MAX_OUTPUT_CHARS


def test_clip_redacts_before_returning():
    assert guard.clip("sk-" + "not_a_real_key_1234567890") == "[REDACTED]"


def test_log_call_appends_jsonl_and_redacts_input(tmp_path, monkeypatch):
    path = tmp_path / "logs" / "audit.jsonl"
    monkeypatch.setattr(guard, "LOG_PATH", str(path))
    fake_key = "sk-" + "not_a_real_key_1234567890"
    first = guard.log_call("send_message", {"text": fake_key, "to": "тест"}, False, "blocked")
    second = guard.log_call("query_db", {"sql": "SELECT 1"}, True, "x" * 600)
    contents = path.read_text(encoding="utf-8")
    assert fake_key not in contents
    assert first["input"] == {"text": "[REDACTED]", "to": "тест"}
    assert first["allowed"] is False
    assert second["result"] == "x" * 500
    assert [json.loads(line) for line in contents.splitlines()] == [first, second]
