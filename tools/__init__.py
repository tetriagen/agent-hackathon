from tools.db import query_db
from tools.notify import send_message

# name -> {"schema": Anthropic tool schema, "fn": callable, "risky": bool}
TOOLS = {
    "query_db": {
        "schema": {
            "name": "query_db",
            "description": "Run a read-only SQL SELECT on the business database. Returns up to 50 rows as JSON.",
            "input_schema": {
                "type": "object",
                "properties": {"sql": {"type": "string", "description": "A single SELECT statement"}},
                "required": ["sql"],
            },
        },
        "fn": query_db,
        "risky": False,
    },
    "send_message": {
        "schema": {
            "name": "send_message",
            "description": "Send a message to a recipient (email/Telegram). Requires user approval.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "to": {"type": "string"},
                    "text": {"type": "string"},
                },
                "required": ["to", "text"],
            },
        },
        "fn": send_message,
        "risky": True,
    },
}
