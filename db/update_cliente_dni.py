"""Update DNI for a cliente by id.

Usage:
    python TP_Canchas/db/update_cliente_dni.py <id> <dni>
"""
import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent / 'DonBalon.db'


def main():
    if len(sys.argv) < 3:
        print('Usage: python update_cliente_dni.py <id> <dni>')
        return
    cid = int(sys.argv[1])
    dni = sys.argv[2]
    db = str(DB)
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute('UPDATE cliente SET dni = ? WHERE id = ?', (dni, cid))
    conn.commit()
    print(f'Updated cliente id={cid} dni={dni}')
    conn.close()


if __name__ == '__main__':
    main()
