import os
import sqlite3
from pathlib import Path
from typing import Optional

# dotenv is optional for local dev; if missing, continue with defaults
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

DEFAULT_DB = os.environ.get('TPC_DB_PATH') or str(Path(__file__).resolve().parent / 'DonBalon.db')

def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DEFAULT_DB
    conn = sqlite3.connect(path, detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
    conn.row_factory = sqlite3.Row
    # enable foreign keys
    conn.execute('PRAGMA foreign_keys = ON;')
    return conn


def test_connection(db_path: Optional[str] = None) -> bool:
    try:
        conn = get_connection(db_path)
        cur = conn.cursor()
        cur.execute('SELECT 1 as ok')
        r = cur.fetchone()
        conn.close()
        return r and r['ok'] == 1
    except Exception:
        return False


def run_script(path: str, db_path: Optional[str] = None):
    """Ejecuta un script SQL (por ejemplo schema o seed)."""
    conn = get_connection(db_path)
    with open(path, 'r', encoding='utf-8') as f:
        script = f.read()
    conn.executescript(script)
    conn.commit()
    conn.close()


def execute(query: str, params: tuple = (), db_path: Optional[str] = None):
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    lastrowid = cur.lastrowid
    conn.close()
    return lastrowid


def fetchall(query: str, params: tuple = (), db_path: Optional[str] = None):
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def fetchone(query: str, params: tuple = (), db_path: Optional[str] = None):
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute(query, params)
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None
