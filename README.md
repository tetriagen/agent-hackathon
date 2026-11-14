# agent-hackathon

## ClearBill scaffold

The medical-bill prototype lives in `billing/` + `web/`. It reads text PDF/TXT
documents locally, compares user-confirmed amounts through FastAPI, and exports
a draft request. No API key is needed. AI extraction and OCR are not yet connected.

**[Run ClearBill and see the implementation boundaries](docs/CLEARBILL.md)**

The original business-agent template below is preserved separately.

Python template for a business assistant: an OpenAI Responses API tool-use loop,
Streamlit chat UI, approval guard, and JSONL audit log. Includes a read-only SQLite
query tool and a message-sending stub. No business-specific logic is implemented.

## Quick start

Use Python 3.12 and run these commands from the project directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

On Windows, activate with `.venv\Scripts\activate` instead. Edit `.env`:

- Replace `OPENAI_API_KEY=your_key_here` with your OpenAI API key.
- Replace `MODEL=set-me` with a model available to your API project, for example
  `MODEL=gpt-6.1-sol`. Check the [official model catalog](https://platform.openai.com/docs/models)
  for Responses API and function-calling support. Access depends on your account.
- Keep `DB_PATH=data/demo.db` to use the demo database.

```bash
python seed.py
pytest
streamlit run app.py
```

Open `http://localhost:8501` and try: "Which orders are overdue?"
`seed.py` recreates the demo `orders` table each time it runs.
The sidebar checkbox approves risky tools while enabled; it is off by default.
`send_message` is a stub and does not send a real email or Telegram message.

Tests use temporary SQLite databases and mocked API responses; no real API key
or network access is required. To check the OpenAI module import separately:

```bash
OPENAI_API_KEY=dummy-not-a-real-key MODEL=gpt-6.1-sol python -c "import agent.loop"
```

## Structure

```text
app.py                 Streamlit chat and approval checkbox
agent/loop.py          OpenAI Responses API loop (maximum 8 steps)
agent/prompts.py       System prompt
agent/guard.py         Approval checks, redaction, output clipping, audit logging
tools/__init__.py      Tool registry and schemas
tools/db.py            Read-only SELECT queries (maximum 50 rows)
tools/notify.py        Message-sending stub
seed.py               Demo database setup
data/                 Generated SQLite database
logs/                 Runtime audit.jsonl
tests/                Guard, database, and mocked agent-loop tests
Dockerfile            Python 3.12 / Streamlit container
```

`.env`, `logs/`, and `data/*.db` are ignored by Git. Only placeholder credentials
belong in `.env.example`.

## Add a tool

1. Add a function in `tools/` that returns a string.
2. Import and register it in `tools/__init__.py` with `schema`, `fn`, and `risky`.
3. Define `name`, `description`, and JSON Schema `input_schema` inside `schema`.
   The loop converts this registry format into OpenAI function-tool definitions.
4. Set `risky=True` for tools that change data or send messages, then add tests.

The guard controls approval and output size; audit events are appended to
`logs/audit.jsonl`. Treat this repository as the specified hackathon template.

## Design toolkit / Набор для дизайна

Для подготовки к хакатону добавлены DESIGN.md, Vercel Web Design Guidelines
и навык Playwright CLI с reference-файлами. Это инструменты разработки;
интерфейс приложения пока не переработан.

**[Инструкция подключения с ноутбука](docs/DESIGN-TOOLKIT.md)**

Правила проекта: [AGENTS.md](AGENTS.md). Визуальные правила: [DESIGN.md](DESIGN.md).
