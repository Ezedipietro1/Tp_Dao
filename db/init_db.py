#!/usr/bin/env python3
"""
Create the SQLite DB at db/DonBalon.db by running schema.sql and seed.sql.
Run from repository root: python db/init_db.py
"""
import sqlite3
from pathlib import Path

HERE = Path(__file__).parent
DB_PATH = HERE / "DonBalon.db"
SCHEMA = HERE / "schema.sql"
SEED = HERE / "seed.sql"

def main():
    if DB_PATH.exists():
        print(f"Removing existing DB at {DB_PATH}")
        DB_PATH.unlink()

    print(f"Creating database at {DB_PATH}")
    sql = ""
    sql += SCHEMA.read_text(encoding='utf-8')
    sql += "\n"
    sql += SEED.read_text(encoding='utf-8')

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.executescript(sql)
    finally:
        conn.close()

    print("Database created.")

if __name__ == '__main__':
    main()
