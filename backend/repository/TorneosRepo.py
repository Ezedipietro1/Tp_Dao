from typing import List, Dict, Any, Optional
from db.connection import execute, fetchone, fetchall
from .ReservasRepo import crear_reserva_por_dni, obtener_reserva
from .CanchasRepo import obtener_cancha

def _ensure_schema():
    # create supporting tables if they don't exist: torneo_meta and torneo_x_cancha
    execute("""
    CREATE TABLE IF NOT EXISTS torneo_meta (
        torneo_id INTEGER PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        cliente_dni TEXT,
        FOREIGN KEY(torneo_id) REFERENCES torneo(id) ON DELETE CASCADE
    );
    """)
    # ensure cliente_dni column exists on older installs
    try:
        execute("ALTER TABLE torneo_meta ADD COLUMN cliente_dni TEXT", ())
    except Exception:
        # ignore if column already exists or alter not needed
        pass
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
    rows = fetchall("SELECT t.id, t.fecha_inicio, m.nombre, m.descripcion, m.cliente_dni FROM torneo t LEFT JOIN torneo_meta m ON t.id = m.torneo_id ORDER BY t.id")
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
            'cliente_dni': r.get('cliente_dni'),
            'canchas': canchas_list
        })
    return result


def obtener_torneo(torneo_id: int) -> Optional[Dict[str, Any]]:
    _ensure_schema()
    row = fetchone("SELECT t.id, t.fecha_inicio, m.nombre, m.descripcion, m.cliente_dni FROM torneo t LEFT JOIN torneo_meta m ON t.id = m.torneo_id WHERE t.id = ?", (torneo_id,))
    if not row:
        return None
    canchas = fetchall("SELECT cancha_id FROM torneo_x_cancha WHERE torneo_id = ?", (torneo_id,)) or []
    canchas_list = [c.get('cancha_id') for c in canchas]
    # also include reservas for this torneo (as serializable dicts)
    reservas_out = []
    try:
        res_rows = fetchall("SELECT id FROM reserva WHERE torneo_id = ? ORDER BY id", (torneo_id,)) or []
        for rr in res_rows:
            try:
                rid = rr.get('id') if isinstance(rr, dict) else (rr[0] if len(rr) > 0 else None)
                if not rid:
                    continue
                robj = obtener_reserva(rid)
                if not robj:
                    continue
                # convert reserva object to dict
                try:
                    fecha = robj.get_fecha() if hasattr(robj, 'get_fecha') else getattr(robj, 'fecha', None)
                    fecha_iso = fecha.isoformat() if hasattr(fecha, 'isoformat') else fecha
                except Exception:
                    fecha_iso = getattr(robj, 'fecha', None)
                horarios = []
                try:
                    raw_hs = getattr(robj, 'horarios', []) or []
                    for h in raw_hs:
                        try:
                            if isinstance(h, dict):
                                hid = h.get('id')
                                inicio = h.get('inicio')
                                fin = h.get('fin')
                            else:
                                # Horario model uses get_id(), get_hora_desde(), get_hora_hasta(), or attributes _id/_hora_desde/_hora_hasta
                                hid = h.get_id() if hasattr(h, 'get_id') else getattr(h, '_id', None)
                                if hasattr(h, 'get_hora_desde'):
                                    inicio = h.get_hora_desde()
                                else:
                                    inicio = getattr(h, '_hora_desde', None) or getattr(h, 'hora_desde', None)
                                if hasattr(h, 'get_hora_hasta'):
                                    fin = h.get_hora_hasta()
                                else:
                                    fin = getattr(h, '_hora_hasta', None) or getattr(h, 'hora_hasta', None)
                                # if inicio/fin are datetime/time objects, format as HH:MM
                                try:
                                    if hasattr(inicio, 'isoformat'):
                                        inicio = inicio.isoformat()
                                except Exception:
                                    pass
                                try:
                                    if hasattr(fin, 'isoformat'):
                                        fin = fin.isoformat()
                                except Exception:
                                    pass
                            horarios.append({'id': hid, 'inicio': inicio, 'fin': fin})
                        except Exception:
                            continue
                except Exception:
                    horarios = []
                reservas_out.append({
                    'id': robj.get_id() if hasattr(robj, 'get_id') else getattr(robj, 'id', None),
                    'cancha_id': (robj.cancha._id if getattr(robj, 'cancha', None) is not None and hasattr(robj.cancha, '_id') else (getattr(robj.cancha, 'id', None) if getattr(robj, 'cancha', None) is not None else getattr(robj, 'cancha_id', None))),
                    'cliente_dni': (robj.cliente.get_dni() if getattr(robj, 'cliente', None) is not None and hasattr(robj.cliente, 'get_dni') else (getattr(robj, 'cliente', None) and getattr(robj.cliente, 'dni', None)) or getattr(robj, 'cliente_dni', None)),
                    'fecha': fecha_iso,
                    'horarios': horarios
                })
            except Exception:
                continue
    except Exception:
        reservas_out = []

    return {
        'id': row.get('id'),
        'fecha_inicio': row.get('fecha_inicio'),
        'nombre': row.get('nombre'),
        'descripcion': row.get('descripcion'),
        'cliente_dni': row.get('cliente_dni'),
        'canchas': canchas_list,
        'reservas': reservas_out
    }


def crear_torneo(payload: Dict[str, Any]) -> int:
    _ensure_schema()
    fecha_inicio = payload.get('fecha_inicio')
    nombre = payload.get('nombre')
    descripcion = payload.get('descripcion')
    cancha_ids = payload.get('canchas') or []
    # create base torneo row
    tid = execute("INSERT INTO torneo (fecha_inicio) VALUES (?)", (fecha_inicio,))
    # insert meta (store cliente_dni if provided)
    cliente_dni = payload.get('cliente_dni')
    execute("INSERT OR REPLACE INTO torneo_meta (torneo_id, nombre, descripcion, cliente_dni) VALUES (?, ?, ?, ?)", (tid, nombre, descripcion, cliente_dni))
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
    if nombre is not None or descripcion is not None or 'cliente_dni' in payload:
        cliente_dni = payload.get('cliente_dni')
        execute("INSERT OR REPLACE INTO torneo_meta (torneo_id, nombre, descripcion, cliente_dni) VALUES (?, ?, ?, ?)", (torneo_id, nombre, descripcion, cliente_dni))
    if cancha_ids is not None:
        # determine existing canchas to detect removed ones
        existing = fetchall("SELECT cancha_id FROM torneo_x_cancha WHERE torneo_id = ?", (torneo_id,)) or []
        existing_list = [c.get('cancha_id') for c in existing]
        removed = [c for c in existing_list if c not in (cancha_ids or [])]
        execute("DELETE FROM torneo_x_cancha WHERE torneo_id = ?", (torneo_id,))
        for cid in cancha_ids:
            execute("INSERT OR IGNORE INTO torneo_x_cancha (torneo_id, cancha_id) VALUES (?, ?)", (torneo_id, cid))
        # if there are removed canchas, delete reservas for those canchas under this torneo
        if removed:
            # gather reservas ids to delete
            placeholders = ','.join('?' for _ in removed)
            q = f"SELECT id FROM reserva WHERE torneo_id = ? AND cancha_id IN ({placeholders})"
            params = tuple([torneo_id] + removed)
            rows = fetchall(q, params) or []
            reserva_ids = [r.get('id') for r in rows]
            if reserva_ids:
                ph = ','.join('?' for _ in reserva_ids)
                # delete pagos, reserva_x_horario, reservas for these ids
                execute(f"DELETE FROM pago WHERE reserva_id IN ({ph})", tuple(reserva_ids))
                execute(f"DELETE FROM reserva_x_horario WHERE reserva_id IN ({ph})", tuple(reserva_ids))
                execute(f"DELETE FROM reserva WHERE id IN ({ph})", tuple(reserva_ids))
    # if fecha_inicio changed, update existing reservas dates to new fecha
    if fecha_inicio is not None:
        execute("UPDATE reserva SET fecha = ? WHERE torneo_id = ?", (fecha_inicio, torneo_id))
    return torneo_id


def eliminar_torneo(torneo_id: int) -> None:
    _ensure_schema()
    # perform deletion steps in a single transaction/connection to avoid transient locks
    from db.connection import get_connection
    conn = get_connection()
    try:
        cur = conn.cursor()
        # delete pagos linked to reservas of this torneo, then reserva_x_horario, then reservas
        cur.execute("SELECT id FROM reserva WHERE torneo_id = ?", (torneo_id,))
        reserva_rows = cur.fetchall()
        reserva_ids = [r[0] for r in reserva_rows] if reserva_rows else []
        if reserva_ids:
            placeholders = ','.join('?' for _ in reserva_ids)
            # delete pagos for these reservas
            cur.execute(f"DELETE FROM pago WHERE reserva_id IN ({placeholders})", tuple(reserva_ids))
            # delete reserva_x_horario entries
            cur.execute(f"DELETE FROM reserva_x_horario WHERE reserva_id IN ({placeholders})", tuple(reserva_ids))
            # delete reservas
            cur.execute(f"DELETE FROM reserva WHERE id IN ({placeholders})", tuple(reserva_ids))
        cur.execute("DELETE FROM torneo_x_cancha WHERE torneo_id = ?", (torneo_id,))
        cur.execute("DELETE FROM torneo_meta WHERE torneo_id = ?", (torneo_id,))
        cur.execute("DELETE FROM torneo WHERE id = ?", (torneo_id,))
        conn.commit()
    finally:
        conn.close()


__all__ = ['listar_torneos', 'obtener_torneo', 'crear_torneo', 'actualizar_torneo', 'eliminar_torneo']
def sincronizar_reservas(torneo_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Sincroniza las reservas de un torneo con el conjunto deseado enviado desde el frontend.
    Payload expected: { 'fecha': 'YYYY-MM-DD', 'cancha_ids': [int,...], 'horario_ids': [int,...], 'cliente_dni': '...'}
    The function will create missing reservas and delete reservas that are not in the desired set (for the given fecha and torneo_id).
    Returns summary with counts: { created: n, deleted: m }
    """
    _ensure_schema()
    fecha = payload.get('fecha')
    cancha_ids = payload.get('cancha_ids') or payload.get('canchas') or []
    horario_ids = payload.get('horario_ids') or payload.get('horarios') or []
    cliente_dni = payload.get('cliente_dni')

    # build desired tuples
    desired = set()
    for cid in (cancha_ids or []):
        for hid in (horario_ids or []):
            try:
                desired.add((int(cid), int(hid)))
            except Exception:
                continue

    created = 0
    deleted = 0

    # fetch existing reservas for this torneo and fecha
    try:
        rows = fetchall("SELECT id, cancha_id FROM reserva WHERE torneo_id = ? AND fecha = ?", (torneo_id, fecha)) or []
        existing_map = {}  # map (cancha_id, horario_id) -> reserva_id
        reserva_to_hs = {}  # reserva_id -> list of horario_ids
        for r in rows:
            rid = r.get('id')
            cid = r.get('cancha_id')
            # get horarios for this reserva
            hs = fetchall("SELECT horario_id FROM reserva_x_horario WHERE reserva_id = ?", (rid,)) or []
            hid_list = [h.get('horario_id') for h in hs]
            reserva_to_hs[rid] = hid_list
            for hid in hid_list:
                existing_map[(cid, hid)] = rid

        # compute creations
        to_create = []
        for tup in desired:
            if tup not in existing_map:
                to_create.append(tup)

        # compute deletions: existing tuples not in desired
        to_delete_reserva_ids = set()
        for (cid, hid), rid in list(existing_map.items()):
            if (cid, hid) not in desired:
                to_delete_reserva_ids.add(rid)

        # create missing reservas
        for (cid, hid) in to_create:
            try:
                cinfo = obtener_cancha(cid)
                precio = cinfo.get('precio_final') if cinfo else 0
                payload_res = { 'cancha_id': cid, 'cliente_dni': cliente_dni, 'fecha': fecha, 'horario_ids': [hid], 'precio': precio, 'torneo_id': torneo_id }
                crear_reserva_por_dni(payload_res)
                created += 1
            except Exception:
                continue

        # delete reservas (and pagos/mappings) for the collected reserva ids
        if to_delete_reserva_ids:
            from db.connection import get_connection
            conn = get_connection()
            try:
                cur = conn.cursor()
                ids = list(to_delete_reserva_ids)
                ph = ','.join('?' for _ in ids)
                cur.execute(f"DELETE FROM pago WHERE reserva_id IN ({ph})", tuple(ids))
                cur.execute(f"DELETE FROM reserva_x_horario WHERE reserva_id IN ({ph})", tuple(ids))
                cur.execute(f"DELETE FROM reserva WHERE id IN ({ph})", tuple(ids))
                conn.commit()
                deleted = len(ids)
            finally:
                conn.close()

    except Exception:
        # on error, return summary with what was done so far
        return {'created': created, 'deleted': deleted}

    return {'created': created, 'deleted': deleted}

__all__.append('sincronizar_reservas')
