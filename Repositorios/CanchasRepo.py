from typing import Dict, Any, List, Optional
from db.connection import fetchall, fetchone, execute
from entidades.cancha import Cancha
from entidades.tipo_cancha import TipoCancha


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
    # remove links to servicios
    execute("DELETE FROM cancha_x_servicio WHERE cancha_id = ?", (cancha_id,))

    # find reservas asociadas a esta cancha
    reserva_rows = fetchall("SELECT id FROM reserva WHERE cancha_id = ?", (cancha_id,))
    reserva_ids = [r.get('id') for r in reserva_rows] if reserva_rows else []

    if reserva_ids:
        # delete pagos asociados a esas reservas (pago.reserva_id -> reserva.id)
        placeholders = ','.join('?' for _ in reserva_ids)
        execute(f"DELETE FROM pago WHERE reserva_id IN ({placeholders})", tuple(reserva_ids))

        # delete reserva_x_horario entries for esas reservas
        execute(f"DELETE FROM reserva_x_horario WHERE reserva_id IN ({placeholders})", tuple(reserva_ids))

        # finally delete las reservas
        execute(f"DELETE FROM reserva WHERE id IN ({placeholders})", tuple(reserva_ids))

    # delete the cancha
    execute("DELETE FROM cancha WHERE id = ?", (cancha_id,))


def buscar_canchas(filters: Dict[str, Any]) -> List[Cancha]:
    """Buscar canchas por filtros opcionales: tipo_cancha_id, min_precio, max_precio."""
    clauses = []
    params: List[Any] = []
    if 'tipo_cancha_id' in filters and filters['tipo_cancha_id'] is not None:
        clauses.append('c.tipo_cancha_id = ?')
        params.append(filters['tipo_cancha_id'])
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
