from typing import Dict, Any, List, Optional
from datetime import date, datetime
from db.connection import fetchall, fetchone, execute
from backend.models.cancha import Cancha
from backend.models.tipo_cancha import TipoCancha


def _row_to_cancha(row: Dict[str, Any]) -> Cancha:
    tipo_obj = None
    # tipo_precio may be provided by the SELECT as tipo_precio; default to 0
    if row.get('tipo_cancha') or row.get('tipo_cancha_id'):
        tipo_precio = row.get('tipo_precio') if row.get('tipo_precio') is not None else 0
        tipo_obj = TipoCancha(row.get('tipo_cancha_id') or 0, row.get('tipo_cancha') or '', tipo_precio)

    # cancha table stores precio_final in the current schema
    cancha_x_servicio = []
    # Create Cancha instance without calling __init__ to avoid entity constructor side-effects
    c = object.__new__(Cancha)
    try:
        c._id = int(row.get('id')) if row.get('id') is not None else None
    except Exception:
        c._id = row.get('id')
    c._tipo = tipo_obj
    c._servicios = cancha_x_servicio
    # set precio from DB if available, otherwise compute from tipo
    try:
        if row.get('precio_final') is not None:
            c._precio = row.get('precio_final')
        else:
            c._precio = tipo_obj.get_precio() if tipo_obj else 0
    except Exception:
        c._precio = 0
    # attach extra attributes for convenience
    try:
        # prefer explicit name column if present, otherwise derive a display name
        if row.get('nombre'):
            c.nombre = row.get('nombre')
        else:
            tipo_name = tipo_obj.get_nombre() if tipo_obj and hasattr(tipo_obj, 'get_nombre') else (tipo_obj._nombre if tipo_obj and hasattr(tipo_obj, '_nombre') else None)
            if tipo_name:
                c.nombre = f"{tipo_name} #{c._id}"
            else:
                c.nombre = f"Cancha {c._id}"
    except Exception:
        pass
    return c


def listar_canchas() -> List[Cancha]:
    q = """
    SELECT c.id, c.precio_final, c.tipo_cancha_id, tc.nombre AS tipo_cancha, tc.precio AS tipo_precio
    FROM cancha c
    LEFT JOIN tipo_cancha tc ON c.tipo_cancha_id = tc.id
    ORDER BY c.id
    """
    rows = fetchall(q)
    return [_row_to_cancha(r) for r in rows]


def obtener_cancha(cancha_id: int) -> Optional[Cancha]:
    q = """
    SELECT c.*, tc.nombre AS tipo_cancha, tc.precio AS tipo_precio
    FROM cancha c
    LEFT JOIN tipo_cancha tc ON c.tipo_cancha_id = tc.id
    WHERE c.id = ?
    """
    row = fetchone(q, (cancha_id,))
    if not row:
        return None
    # build a lightweight dict with servicios included
    cancha_obj = _row_to_cancha(row)
    # fetch servicios linked to this cancha
    svc_rows = fetchall("SELECT s.id, s.nombre, s.precio FROM servicio s JOIN cancha_x_servicio cx ON s.id = cx.servicio_id WHERE cx.cancha_id = ?", (cancha_id,))
    servicios = svc_rows or []
    return {
        'id': getattr(cancha_obj, '_id', None),
        'nombre': getattr(cancha_obj, 'nombre', None),
        'tipo_cancha_id': row.get('tipo_cancha_id'),
        'precio_final': row.get('precio_final') if row.get('precio_final') is not None else row.get('tipo_precio'),
        'tipo_cancha': row.get('tipo_cancha'),
        'tipo_precio': row.get('tipo_precio'),
        'servicios': servicios,
    }


def crear_cancha(data: Dict[str, Any]) -> int:
    # expect tipo_cancha_id and optional servicio_ids; ignore any provided id/precio
    tipo_id = data.get('tipo_cancha_id')
    if not tipo_id:
        raise ValueError('tipo_cancha_id es requerido')
    servicio_ids = data.get('servicio_ids') or []
    # get tipo precio
    tp = fetchone("SELECT precio FROM tipo_cancha WHERE id = ?", (tipo_id,))
    tipo_precio = float(tp.get('precio')) if tp and tp.get('precio') is not None else 0.0
    servicios_precio = 0
    if servicio_ids:
        placeholders = ','.join('?' for _ in servicio_ids)
        qsum = f"SELECT SUM(precio) AS total FROM servicio WHERE id IN ({placeholders})"
        row = fetchone(qsum, tuple(servicio_ids))
        servicios_precio = row.get('total') if row and row.get('total') is not None else 0

    precio_final = float(tipo_precio) + float(servicios_precio or 0)
    q = "INSERT INTO cancha (tipo_cancha_id, precio_final) VALUES (?, ?)"
    cancha_id = execute(q, (tipo_id, precio_final))

    # link services (if any)
    for sid in servicio_ids:
        execute("INSERT OR IGNORE INTO cancha_x_servicio (cancha_id, servicio_id) VALUES (?, ?)", (cancha_id, sid))

    return cancha_id


def actualizar_cancha(cancha_id: int, data: Dict[str, Any]) -> int:
    """Actualizar tipo y servicios de una cancha. Recalcula `precio_final`.
    `data` puede contener `tipo_cancha_id` y `servicio_ids`.
    Retorna filas afectadas para la update.
    """
    tipo_id = data.get('tipo_cancha_id')
    servicio_ids = data.get('servicio_ids')
    # prevent updates if there are upcoming or in-progress reservas for this cancha
    if _tiene_reservas_activas(cancha_id):
        raise ValueError('No se puede modificar la cancha: existen reservas futuras o en curso.')
    # if tipo not provided, read current
    if not tipo_id:
        row = fetchone("SELECT tipo_cancha_id FROM cancha WHERE id = ?", (cancha_id,))
        tipo_id = row.get('tipo_cancha_id') if row else None

    tp = fetchone("SELECT precio FROM tipo_cancha WHERE id = ?", (tipo_id,))
    tipo_precio = tp.get('precio') if tp and tp.get('precio') is not None else 0
    servicios_precio = 0
    if servicio_ids:
        placeholders = ','.join('?' for _ in servicio_ids)
        qsum = f"SELECT SUM(precio) AS total FROM servicio WHERE id IN ({placeholders})"
        row = fetchone(qsum, tuple(servicio_ids))
        servicios_precio = row.get('total') if row and row.get('total') is not None else 0

    precio_final = tipo_precio + servicios_precio
    q = "UPDATE cancha SET tipo_cancha_id = ?, precio_final = ? WHERE id = ?"
    res = execute(q, (tipo_id, precio_final, cancha_id))

    # update service links if provided
    if servicio_ids is not None:
        execute("DELETE FROM cancha_x_servicio WHERE cancha_id = ?", (cancha_id,))
        for sid in servicio_ids:
            execute("INSERT OR IGNORE INTO cancha_x_servicio (cancha_id, servicio_id) VALUES (?, ?)", (cancha_id, sid))

    return res


def eliminar_cancha(cancha_id: int) -> None:
    """Eliminar cancha y sus relaciones con servicios."""
    # Do not allow deletion if there are upcoming or in-progress reservas for this cancha
    if _tiene_reservas_activas(cancha_id):
        raise ValueError('No se puede eliminar la cancha: existen reservas futuras o en curso.')

    # remove links to servicios
    execute("DELETE FROM cancha_x_servicio WHERE cancha_id = ?", (cancha_id,))

    # delete the cancha
    execute("DELETE FROM cancha WHERE id = ?", (cancha_id,))


def buscar_canchas(filters: Dict[str, Any]) -> List[Cancha]:
    """Buscar canchas por filtros opcionales: tipo_cancha_id, min_precio, max_precio."""
    clauses = []
    params: List[Any] = []
    if 'tipo_cancha_id' in filters and filters['tipo_cancha_id'] is not None:
        clauses.append('c.tipo_cancha_id = ?')
        params.append(filters['tipo_cancha_id'])
    # optional name filter: match against cancha.nombre or tipo_cancha.nombre (case-insensitive LIKE)
    if 'nombre' in filters and filters['nombre']:
        # search only against tipo_cancha.nombre (db doesn't have c.nombre column)
        clauses.append("LOWER(COALESCE(tc.nombre, '')) LIKE ?")
        term = f"%{str(filters['nombre']).strip().lower()}%"
        params.append(term)
    if 'min_precio' in filters and filters['min_precio'] is not None:
        clauses.append('COALESCE(c.precio_final, tc.precio) >= ?')
        params.append(filters['min_precio'])
    if 'max_precio' in filters and filters['max_precio'] is not None:
        clauses.append('COALESCE(c.precio_final, tc.precio) <= ?')
        params.append(filters['max_precio'])

    where = ('WHERE ' + ' AND '.join(clauses)) if clauses else ''
    q = f"SELECT c.id, c.precio_final, c.tipo_cancha_id, tc.nombre AS tipo_cancha, tc.precio AS tipo_precio FROM cancha c LEFT JOIN tipo_cancha tc ON c.tipo_cancha_id = tc.id {where} ORDER BY c.id"
    rows = fetchall(q, tuple(params)) if params else fetchall(q)
    return [_row_to_cancha(r) for r in rows]


def listar_servicios() -> List[Dict[str, Any]]:
    q = "SELECT id, nombre, precio FROM servicio ORDER BY id"
    return fetchall(q)


def listar_tipos() -> List[Dict[str, Any]]:
    q = "SELECT id, nombre, precio FROM tipo_cancha ORDER BY id"
    return fetchall(q)


def contar_reservas(cancha_id: int) -> int:
    """Retorna la cantidad de reservas asociadas a una cancha (0 si no hay)."""
    row = fetchone("SELECT COUNT(1) AS cnt FROM reserva WHERE cancha_id = ?", (cancha_id,))
    try:
        return int(row.get('cnt')) if row and row.get('cnt') is not None else 0
    except Exception:
        return 0


def _tiene_reservas_activas(cancha_id: int) -> bool:
    """Retorna True si la cancha tiene reservas futuras o en curso (no finalizadas)."""
    try:
        today = date.today()
        today_iso = today.isoformat()
        rows = fetchall("SELECT id, fecha FROM reserva WHERE cancha_id = ? AND fecha >= ? ORDER BY fecha", (cancha_id, today_iso)) or []
        for r in rows:
            fecha_raw = r.get('fecha')
            try:
                fecha_dt = datetime.fromisoformat(fecha_raw).date() if isinstance(fecha_raw, str) else fecha_raw
            except Exception:
                fecha_dt = None
            if fecha_dt is None:
                # conservative: if we can't parse, assume active
                return True
            if fecha_dt > today:
                return True
            if fecha_dt == today:
                # check horarios for this reserva: if any horario finishes after current time, consider active
                hrs = fetchall("SELECT h.inicio, h.fin FROM horario h JOIN reserva_x_horario rx ON h.id = rx.horario_id WHERE rx.reserva_id = ?", (r.get('id'),)) or []
                max_fin_min = None
                earliest_start_min = None
                for h in hrs:
                    inicio = h.get('inicio')
                    fin = h.get('fin')
                    if inicio and fin:
                        try:
                            parts_i = str(inicio).split(':')
                            parts_f = str(fin).split(':')
                            ih = int(parts_i[0]); im = int(parts_i[1]) if len(parts_i)>1 else 0
                            fh = int(parts_f[0]); fm = int(parts_f[1]) if len(parts_f)>1 else 0
                        except Exception:
                            continue
                        start_min = ih*60 + im
                        end_min = fh*60 + fm
                        if end_min <= start_min:
                            end_min += 24*60
                        if earliest_start_min is None or start_min < earliest_start_min:
                            earliest_start_min = start_min
                        if max_fin_min is None or end_min > max_fin_min:
                            max_fin_min = end_min
                if max_fin_min is None:
                    # no horarios found, consider active (conservative)
                    return True
                now = datetime.now()
                now_min = now.hour*60 + now.minute
                now_comp = now_min
                if max_fin_min > 24*60 and earliest_start_min is not None and now_min < earliest_start_min:
                    now_comp = now_min + 24*60
                # if current time is before or equal to max_fin_min then reservation is still active
                if now_comp <= max_fin_min:
                    return True
        return False
    except Exception:
        # on error be conservative and say there are active reservations
        return True
