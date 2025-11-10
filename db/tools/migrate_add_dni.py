"""Migration helper: add 'dni' column to 'cliente' table if missing and populate defaults.

Usage:
    python TP_Canchas/db/migrate_add_dni.py

This script will:
- Detect if 'dni' column exists in the 'cliente' table.
- If missing, ALTER TABLE to add the column (SQLite allows ADD COLUMN).
- Populate existing rows with a default DNI of the form 'DNI<id>' unless a mapping is provided.
- Print instructions for manual correction of real DNIs.
"""
import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent / 'DonBalon.db'


def column_exists(conn, table: str, column: str) -> bool:
    cur = conn.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cur.fetchall()]
    return column in cols


def add_dni_column(conn):
    print('Adding column dni to cliente...')
    conn.execute("ALTER TABLE cliente ADD COLUMN dni TEXT")
    conn.commit()


def populate_dni_defaults(conn):
    print('Populating default DNI values for existing clientes...')
    cur = conn.execute("SELECT id FROM cliente")
    rows = cur.fetchall()
    for (cid,) in rows:
        default = f'DNI{cid:06d}'
        conn.execute("UPDATE cliente SET dni = ? WHERE id = ? AND (dni IS NULL OR dni = '')", (default, cid))
    conn.commit()


def main(db_path=None):
    db = str(db_path or DB)
    print('Using DB:', db)
    conn = sqlite3.connect(db)
    if column_exists(conn, 'cliente', 'dni'):
        print('Column dni already exists in cliente. No action taken.')
        conn.close()
        return
    add_dni_column(conn)
    populate_dni_defaults(conn)
    print('Migration completed. Please review clientes and update real DNIs where needed.')
    conn.close()


if __name__ == '__main__':
    dbp = sys.argv[1] if len(sys.argv) > 1 else None
    main(dbp)
