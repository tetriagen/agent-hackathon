import json
import sqlite3

import pytest

from tools.db import MAX_ROWS, query_db


@pytest.fixture
def database(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    with sqlite3.connect(path) as con:
        con.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, amount REAL)")
        con.executemany(
            "INSERT INTO orders VALUES (?, ?, ?)",
            [(i, f"Клиент {i}", i * 10.0) for i in range(1, 61)],
        )
    monkeypatch.setenv("DB_PATH", str(path))
    return path


def test_select_returns_json_rows(database):
    assert json.loads(query_db(" SELECT id, customer, amount FROM orders WHERE id = 1; ")) == [
        {"id": 1, "customer": "Клиент 1", "amount": 10.0}
    ]


def test_select_limits_rows(database):
    rows = json.loads(query_db("SELECT id FROM orders ORDER BY id"))
    assert len(rows) == MAX_ROWS
    assert rows[0] == {"id": 1}
    assert rows[-1] == {"id": 50}


@pytest.mark.parametrize("sql", [
    "DROP TABLE orders",
    "DELETE FROM orders",
    "SELECT * FROM orders; DROP TABLE orders",
    "SELECT 1; SELECT 2",
])
def test_rejects_writes_and_multiple_statements(database, sql):
    assert query_db(sql) == "Error: only a single SELECT statement is allowed."
    with sqlite3.connect(database) as con:
        assert con.execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 60


def test_invalid_select_returns_error(database):
    assert query_db("SELECT * FROM missing_table").startswith("Error:")


def test_missing_database_is_not_created(tmp_path, monkeypatch):
    path = tmp_path / "missing.db"
    monkeypatch.setenv("DB_PATH", str(path))
    assert query_db("SELECT 1").startswith("Error:")
    assert not path.exists()
