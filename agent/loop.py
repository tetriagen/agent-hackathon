import json
import os

from dotenv import load_dotenv
from openai import OpenAI

from agent.guard import check_call, clip, log_call
from agent.prompts import SYSTEM_PROMPT
from tools import TOOLS

load_dotenv()
client = OpenAI()
MODEL = os.environ["MODEL"]
MAX_STEPS = 8


def _tool_specs() -> list:
    return [
        {
            "type": "function",
            "name": t["schema"]["name"],
            "description": t["schema"]["description"],
            "parameters": t["schema"]["input_schema"],
        }
        for t in TOOLS.values()
    ]


def execute(name: str, args: dict, approved: bool) -> tuple[str, dict]:
    tool = TOOLS.get(name)
    if tool is None:
        result, allowed = f"Error: unknown tool {name}", False
    else:
        allowed, reason = check_call(tool, args, approved)
        if allowed:
            try:
                result = clip(tool["fn"](**args))
            except Exception as e:
                result = clip(f"Error: {e}")
        else:
            result = reason
    event = log_call(name, args, allowed, result)
    return result, event


def run_agent(history: list, approve=lambda name, args: False, on_event=lambda e: None) -> str:
    """history: list of Responses API input items (mutated in place)."""
    for _ in range(MAX_STEPS):
        resp = client.responses.create(
            model=MODEL,
            instructions=SYSTEM_PROMPT,
            input=history,
            tools=_tool_specs(),
        )
        history += resp.output
        calls = [i for i in resp.output if i.type == "function_call"]
        if not calls:
            return resp.output_text
        for call in calls:
            args = json.loads(call.arguments)
            out, event = execute(call.name, args, approve(call.name, args))
            on_event(event)
            history.append({"type": "function_call_output", "call_id": call.call_id, "output": out})
    return "Step limit reached. Please rephrase or narrow the request."
