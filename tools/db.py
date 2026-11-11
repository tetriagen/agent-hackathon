import json
import os
import sqlite3

MAX_ROWS = 50


def query_db(sql: str) -> str:
    stmt = sql.strip().rstrip(";")
    if ";" in stmt or not stmt.lower().startswith("select"):
        return "Error: only a single SELECT statement is allowed."
    path = os.getenv("DB_PATH", "data/demo.db")
    try:
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        con.row_factory = sqlite3.Row
        rows = con.execute(stmt).fetchmany(MAX_ROWS)
        con.close()
        return json.dumps([dict(r) for r in rows], ensure_ascii=False, default=str)
    except Exception as e:
        return f"Error: {e}"
