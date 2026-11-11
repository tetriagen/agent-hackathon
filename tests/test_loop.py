import importlib
import json
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from agent import guard


@pytest.fixture
def loop(tmp_path, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "dummy-not-a-real-key")
    monkeypatch.setenv("MODEL", "test-model")
    monkeypatch.setattr(guard, "LOG_PATH", str(tmp_path / "logs" / "audit.jsonl"))
    return importlib.import_module("agent.loop")


@pytest.mark.parametrize("approved", [False, True])
def test_execute_respects_risky_tool_approval(loop, monkeypatch, approved):
    fn = Mock(return_value="sent")
    monkeypatch.setattr(loop, "TOOLS", {"send_message": {"fn": fn, "risky": True}})
    result, event = loop.execute("send_message", {"to": "test", "text": "hello"}, approved)
    assert event["allowed"] is approved
    if approved:
        fn.assert_called_once_with(to="test", text="hello")
        assert result == "sent"
    else:
        fn.assert_not_called()
        assert result.startswith("Approval required:")


def test_unknown_tool_is_blocked_and_logged(loop):
    result, event = loop.execute("missing_tool", {}, True)
    assert result == "Error: unknown tool missing_tool"
    assert event["allowed"] is False


def test_agent_round_trip_preserves_history_and_returns_tool_output(loop, monkeypatch):
    history = [{"role": "user", "content": "Calculate 1 + 1"}]
    call = SimpleNamespace(type="function_call", name="query_db", arguments='{"sql":"SELECT 1 + 1 AS total"}', call_id="call_test")
    reasoning = SimpleNamespace(type="reasoning", id="reasoning_test")
    message = SimpleNamespace(type="message")
    create = Mock(side_effect=[
        SimpleNamespace(output=[reasoning, call], output_text=""),
        SimpleNamespace(output=[message], output_text="2"),
    ])
    monkeypatch.setattr(loop.client.responses, "create", create)
    fn = Mock(return_value='[{"total": 2}]')
    monkeypatch.setitem(loop.TOOLS, "query_db", {**loop.TOOLS["query_db"], "fn": fn})
    approve = Mock(return_value=False)
    events = []

    assert loop.run_agent(history, approve=approve, on_event=events.append) == "2"
    assert create.call_count == 2
    fn.assert_called_once_with(sql="SELECT 1 + 1 AS total")
    approve.assert_called_once_with("query_db", {"sql": "SELECT 1 + 1 AS total"})
    assert history[1:3] == [reasoning, call]
    assert history[3] == {"type": "function_call_output", "call_id": "call_test", "output": '[{"total": 2}]'}
    assert history[4] is message
    assert events[0]["allowed"] is True
    request = create.call_args.kwargs
    assert request["model"] == loop.MODEL
    assert request["instructions"] == loop.SYSTEM_PROMPT
    specs = {tool["name"]: tool for tool in request["tools"]}
    assert specs["query_db"]["type"] == "function"
    assert specs["query_db"]["parameters"] == loop.TOOLS["query_db"]["schema"]["input_schema"]


def test_agent_stops_after_step_limit(loop, monkeypatch):
    call = SimpleNamespace(type="function_call", name="missing_tool", arguments=json.dumps({}), call_id="call_test")
    create = Mock(return_value=SimpleNamespace(output=[call], output_text=""))
    monkeypatch.setattr(loop.client.responses, "create", create)
    events = []
    assert loop.run_agent([], on_event=events.append) == "Step limit reached. Please rephrase or narrow the request."
    assert create.call_count == 8
    assert len(events) == 8
