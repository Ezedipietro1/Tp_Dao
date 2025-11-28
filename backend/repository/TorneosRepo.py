from typing import List, Dict, Any, Optional
from db.connection import execute, fetchone, fetchall
from .ReservasRepo import crear_reserva_por_dni
from .CanchasRepo import obtener_cancha

def _ensure_schema():
    # create supporting tables if they don't exist: torneo_meta and torneo_x_cancha
    execute("""
    CREATE TABLE IF NOT EXISTS torneo_meta (
        torneo_id INTEGER PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        FOREIGN KEY(torneo_id) REFERENCES torneo(id) ON DELETE CASCADE
    );
    """)
    execute("""
    CREATE TABLE IF NOT EXISTS torneo_x_cancha (
        torneo_id INTEGER,
        cancha_id INTEGER,
        PRIMARY KEY (torneo_id, cancha_id),
        FOREIGN KEY(torneo_id) REFERENCES torneo(id) ON DELETE CASCADE,
        FOREIGN KEY(cancha_id) REFERENCES cancha(id)
    );
    """)


def listar_torneos() -> List[Dict[str, Any]]:
    _ensure_schema()
    rows = fetchall("SELECT t.id, t.fecha_inicio, m.nombre, m.descripcion FROM torneo t LEFT JOIN torneo_meta m ON t.id = m.torneo_id ORDER BY t.id")
    result = []
    for r in rows:
        tid = r.get('id')
        canchas = fetchall("SELECT cancha_id FROM torneo_x_cancha WHERE torneo_id = ?", (tid,)) or []
        canchas_list = [c.get('cancha_id') for c in canchas]
        result.append({
            'id': tid,
            'fecha_inicio': r.get('fecha_inicio'),
            'nombre': r.get('nombre'),
            'descripcion': r.get('descripcion'),
            'canchas': canchas_list
        })
    return result


def obtener_torneo(torneo_id: int) -> Optional[Dict[str, Any]]:
    _ensure_schema()
    row = fetchone("SELECT t.id, t.fecha_inicio, m.nombre, m.descripcion FROM torneo t LEFT JOIN torneo_meta m ON t.id = m.torneo_id WHERE t.id = ?", (torneo_id,))
    if not row:
        return None
    canchas = fetchall("SELECT cancha_id FROM torneo_x_cancha WHERE torneo_id = ?", (torneo_id,)) or []
    canchas_list = [c.get('cancha_id') for c in canchas]
    return {
        'id': row.get('id'),
        'fecha_inicio': row.get('fecha_inicio'),
        'nombre': row.get('nombre'),
        'descripcion': row.get('descripcion'),
        'canchas': canchas_list
    }


def crear_torneo(payload: Dict[str, Any]) -> int:
    _ensure_schema()
    fecha_inicio = payload.get('fecha_inicio')
    nombre = payload.get('nombre')
    descripcion = payload.get('descripcion')
    cancha_ids = payload.get('canchas') or []
    # create base torneo row
    tid = execute("INSERT INTO torneo (fecha_inicio) VALUES (?)", (fecha_inicio,))
    # insert meta
    execute("INSERT OR REPLACE INTO torneo_meta (torneo_id, nombre, descripcion) VALUES (?, ?, ?)", (tid, nombre, descripcion))
    # insert mappings
    for cid in cancha_ids:
        execute("INSERT OR IGNORE INTO torneo_x_cancha (torneo_id, cancha_id) VALUES (?, ?)", (tid, cid))
    # optionally create associated reservas if provided in payload
    # expected structure: payload['reservas'] = [ { 'fecha': 'YYYY-MM-DD', 'cancha_id': int, 'horario_ids': [int,...], 'cliente_dni': '...', (optional) 'precio': number (optional) }, ... ]
    reservas = payload.get('reservas') or []
    created_reservas = []
    for r in reservas:
        try:
            # ensure required fields
            fecha = r.get('fecha')
            cancha_id = r.get('cancha_id')
            horario_ids = r.get('horario_ids') or r.get('horario_id')
            cliente_dni = r.get('cliente_dni') or payload.get('cliente_dni')
            # compute precio if not provided: use cancha precio_final
            precio = r.get('precio')
            if precio is None:
                cinfo = obtener_cancha(cancha_id)
                precio = cinfo.get('precio_final') if cinfo else 0
            # build reserva payload for crear_reserva_por_dni
            reserva_payload = {
                'cancha_id': cancha_id,
                'cliente_dni': cliente_dni,
                'fecha': fecha,
                'horario_ids': horario_ids,
                'precio': precio,
                'torneo_id': tid,
            }
            res_id = crear_reserva_por_dni(reserva_payload)
            created_reservas.append(res_id)
        except Exception:
            # on error creating a specific reserva, continue with others (caller may inspect torneo afterwards)
            continue

    return tid


def actualizar_torneo(torneo_id: int, payload: Dict[str, Any]) -> int:
    _ensure_schema()
    fecha_inicio = payload.get('fecha_inicio')
    nombre = payload.get('nombre')
    descripcion = payload.get('descripcion')
    cancha_ids = payload.get('canchas')
    if fecha_inicio is not None:
        execute("UPDATE torneo SET fecha_inicio = ? WHERE id = ?", (fecha_inicio, torneo_id))
    if nombre is not None or descripcion is not None:
        execute("INSERT OR REPLACE INTO torneo_meta (torneo_id, nombre, descripcion) VALUES (?, ?, ?)", (torneo_id, nombre, descripcion))
    if cancha_ids is not None:
        execute("DELETE FROM torneo_x_cancha WHERE torneo_id = ?", (torneo_id,))
        for cid in cancha_ids:
            execute("INSERT OR IGNORE INTO torneo_x_cancha (torneo_id, cancha_id) VALUES (?, ?)", (torneo_id, cid))
    return torneo_id


def eliminar_torneo(torneo_id: int) -> None:
    _ensure_schema()
    # detach reservas from torneo to preserve history
    execute("UPDATE reserva SET torneo_id = NULL WHERE torneo_id = ?", (torneo_id,))
    execute("DELETE FROM torneo_x_cancha WHERE torneo_id = ?", (torneo_id,))
    execute("DELETE FROM torneo_meta WHERE torneo_id = ?", (torneo_id,))
    execute("DELETE FROM torneo WHERE id = ?", (torneo_id,))


__all__ = ['listar_torneos', 'obtener_torneo', 'crear_torneo', 'actualizar_torneo', 'eliminar_torneo']
