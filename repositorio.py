"""Repositorio SQL directo para TP_Canchas (SQLite).
Ahora devuelve instancias de las clases en `TP_Canchas.entidades` cuando es posible.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from db.connection import fetchall, fetchone, execute
from entidades.cancha import Cancha
from entidades.reserva import Reserva
from entidades.servicio import Servicio
from entidades.cliente import Cliente
from entidades.horario import Horario
from entidades.tipo_cancha import TipoCancha
from entidades.estado import Estado


def _row_to_cancha(row: Dict[str, Any]) -> Cancha:
    # row may contain id, nombre, precio_por_hora, tipo_cancha_id, estado_id, tipo_cancha (nombre), estado (nombre)
    tipo_obj = None
    estado_obj = None
    if row.get('tipo_cancha') or row.get('tipo_cancha_id'):
        # tipo_precio may be provided by the SELECT as tipo_precio; default to 0
        tipo_precio = row.get('tipo_precio') if row.get('tipo_precio') is not None else 0
        tipo_obj = TipoCancha(row.get('tipo_cancha_id') or 0, row.get('tipo_cancha') or '', tipo_precio)
    # estado not stored on cancha in current schema; leave estado_obj None
    # cancha table stores precio_final in the current schema
    # Cancha constructor requires (id, tipo, cancha_x_servicio)
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
            tipo_name = tipo_obj.nombre if tipo_obj and hasattr(tipo_obj, 'nombre') else None
            if tipo_name:
                c.nombre = f"{tipo_name} #{c._id}"
            else:
                c.nombre = f"Cancha {c._id}"
    except Exception:
        pass
    return c


def _row_to_reserva(row: Dict[str, Any]) -> Reserva:
    # Map basic fields; Reserva now stores fecha (YYYY-MM-DD) and horarios are
    # represented in reserva_x_horario. We'll read fecha directly and later
    # fetch associated horarios.
    fecha = None
    if row.get('fecha'):
        try:
            fecha = datetime.fromisoformat(row.get('fecha')).date()
        except Exception:
            fecha = None
    # Build Cliente object from available cliente fields (cliente schema: dni, nombre, telefono)
    cliente_obj = None
    if row.get('cliente_dni') or row.get('cliente_nombre'):
        cliente_obj = Cliente(row.get('cliente_dni'), row.get('cliente_nombre'), '', None, row.get('cliente_telefono'))
    # Build Cancha object (minimal) from reserva join
    cancha_obj = None
    if row.get('cancha_id'):
        # build a minimal TipoCancha to satisfy Cancha constructor; set its price to the cancha.precio_final
        try:
            tipo_nombre = row.get('cancha_tipo')
        except Exception:
            tipo_nombre = None
        tipo_obj_for_cancha = TipoCancha(row.get('cancha_id') or 0, tipo_nombre or '', row.get('precio_final') or 0)
        # create Cancha without invoking its __init__ (entities may compute precio in __init__)
        cancha_obj = object.__new__(Cancha)
        try:
            cancha_obj._id = int(row.get('cancha_id'))
        except Exception:
            cancha_obj._id = row.get('cancha_id')
        cancha_obj._tipo = tipo_obj_for_cancha
        cancha_obj._servicios = []
        cancha_obj._precio = row.get('precio_final') or tipo_obj_for_cancha.get_precio()
        try:
            cancha_obj.nombre = row.get('cancha_nombre')
        except Exception:
            pass

    # Build Reserva (horarios will be fetched below). Reserva constructor expects a list of Horario objects.
    r = Reserva(id=row.get('id'), cliente=cliente_obj, cancha=cancha_obj, horarios=[], fecha=fecha)
    # If DB stored precio_final, prefer that value over computed one
    try:
        if row.get('precio_final') is not None:
            r._precio_final = row.get('precio_final')
    except Exception:
        pass
    try:
        r.cancha_nombre = row.get('cancha_nombre')
        # attach fecha for convenience
        r.fecha = row.get('fecha')
        # fetch associated horarios (id, inicio, fin)
        try:
            hrs = fetchall("SELECT h.id, h.inicio, h.fin FROM horario h JOIN reserva_x_horario rx ON h.id = rx.horario_id WHERE rx.reserva_id = ? ORDER BY h.inicio", (row.get('id'),))
            # convert horario rows into Horario entities where possible
            horario_objs = []
            for h in hrs:
                try:
                    # Horario constructor expects (id, hora_desde, hora_hasta)
                    horario_objs.append(Horario(h.get('id'), h.get('inicio'), h.get('fin')))
                except Exception:
                    # best-effort: append a minimal dict-like object fallback
                    try:
                        horario_objs.append(Horario(h.get('id'), h.get('inicio'), h.get('fin')))
                    except Exception:
                        pass
            r.horarios = horario_objs
            # also expose a convenience string list of inicio-fin
            r.horarios_label = [f"{h.get('inicio')}-{h.get('fin')}" for h in hrs]
        except Exception:
            r.horarios = []
            r.horarios_label = []
        # expose cliente attrs for convenience
        if cliente_obj:
            r.cliente_nombre = cliente_obj.get_nombre()
            r.cliente_apellido = cliente_obj.get_apellido()
    except Exception:
        pass
    return r


def get_cliente_por_dni(dni: str) -> Optional[Dict[str, Any]]:
    # cliente table columns: dni, nombre, telefono
    q = "SELECT dni, nombre, telefono FROM cliente WHERE dni = ?"
    return fetchone(q, (dni,))


def crear_cliente(cliente: Dict[str, Any]) -> int:
    """cliente dict debe tener: dni, nombre, apellido, email, telefono (email/telefono opcionales)
    Retorna id de cliente.
    """
    # cliente table: dni, nombre, telefono
    q = "INSERT INTO cliente (dni, nombre, telefono) VALUES (?, ?, ?)"
    return execute(q, (cliente.get('dni'), cliente.get('nombre'), cliente.get('telefono')))


def crear_reserva_por_dni(reserva: Dict[str, Any]) -> int:
    """Crear reserva usando cliente DNI. Acepta payload con: cliente_dni, cancha_id, fecha (YYYY-MM-DD), horario_ids (list) y precio.
    Si el cliente no existe, lo crea mínimamente.
    """
    dni = reserva.get('cliente_dni')
    if not dni:
        raise ValueError('cliente_dni es requerido')
    c = get_cliente_por_dni(dni)
    if not c:
        crear_cliente({'dni': dni, 'nombre': reserva.get('cliente_nombre', 'Anonimo'), 'telefono': None})

    # Normalize payload to the new crear_reserva shape
    payload = {
        'cancha_id': reserva.get('cancha_id'),
        'cliente_dni': dni,
        'fecha': reserva.get('fecha'),
        'horario_ids': reserva.get('horario_ids') or ([reserva.get('horario_id')] if reserva.get('horario_id') else None),
        'precio': reserva.get('precio'),
        'torneo_id': reserva.get('torneo_id') if 'torneo_id' in reserva else None,
    }
    return crear_reserva(payload)


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
    return _row_to_cancha(row) if row else None


def verificar_disponibilidad(cancha_id: int, inicio_iso: str, fin_iso: str) -> bool:
    """Devuelve True si la cancha está disponible en el intervalo [inicio, fin).
    Las fechas deben recibirse en formato ISO 'YYYY-MM-DDTHH:MM:SS' o compatibles.
    """
    q = """
    SELECT COUNT(1) AS cnt FROM reserva
    WHERE cancha_id = ?
      AND estado_id = 1 -- activa
      AND NOT (fin <= ? OR inicio >= ?)
    """
    row = fetchone(q, (cancha_id, inicio_iso, fin_iso))
    return row and row.get('cnt', 0) == 0


def verificar_disponibilidad_por_horario(cancha_id: int, fecha: str, horario_id: int) -> bool:
    """True si el horario está disponible para una cancha en una fecha concreta (sin reservas activas)."""
    q = """
    SELECT COUNT(1) AS cnt FROM reserva r
    JOIN reserva_x_horario rx ON r.id = rx.reserva_id
    WHERE r.cancha_id = ? AND r.fecha = ? AND rx.horario_id = ?
    """
    row = fetchone(q, (cancha_id, fecha, horario_id))
    return row and row.get('cnt', 0) == 0


def crear_reserva(reserva: Dict[str, Any]) -> int:
    """Crear una reserva usando fecha + lista de horario_ids.
    reserva must contain: cancha_id, cliente_dni, fecha (YYYY-MM-DD), horario_ids (list), precio, optional torneo_id
    Returns inserted reserva id.
    """
    cancha_id = reserva.get('cancha_id')
    cliente_dni = reserva.get('cliente_dni')
    fecha = reserva.get('fecha')
    horario_ids = reserva.get('horario_ids') or reserva.get('horario_id')
    precio = reserva.get('precio')
    torneo_id = reserva.get('torneo_id')

    if not cancha_id or not cliente_dni or not fecha or not horario_ids or not precio:
        raise ValueError('Faltan campos en la reserva. Se requieren: cancha_id, cliente_dni, fecha, horario_ids, precio')

    # normalize single horario_id -> list
    if isinstance(horario_ids, int):
        horario_ids = [horario_ids]

    # Check conflicts for each horario
    for hid in horario_ids:
        if not verificar_disponibilidad_por_horario(cancha_id, fecha, hid):
            raise ValueError(f'Horario {hid} no disponible para la cancha {cancha_id} en la fecha {fecha}')

    # insert reserva (schema: cancha_id, cliente_dni, precio_final, fecha, torneo_id)
    q = "INSERT INTO reserva (cancha_id, cliente_dni, precio_final, fecha, torneo_id) VALUES (?, ?, ?, ?, ?)"
    reserva_id = execute(q, (cancha_id, cliente_dni, precio, fecha, torneo_id))

    # insert reserva_x_horario rows
    for hid in horario_ids:
        execute("INSERT INTO reserva_x_horario (reserva_id, horario_id) VALUES (?, ?)", (reserva_id, hid))

    return reserva_id


def cancelar_reserva(reserva_id: int) -> None:
    # schema doesn't have estado_id for reserva; delete reserva and its horario links
    execute("DELETE FROM reserva_x_horario WHERE reserva_id = ?", (reserva_id,))
    execute("DELETE FROM reserva WHERE id = ?", (reserva_id,))


def listar_reservas(cancha_id: Optional[int] = None) -> List[Reserva]:
    # select cliente and cancha details compatible with current schema
    base = ("SELECT r.*, ch.id AS cancha_id, ch.precio_final AS precio_final, tc.nombre AS cancha_tipo, "
            "cl.dni AS cliente_dni, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono "
            "FROM reserva r JOIN cancha ch ON r.cancha_id = ch.id LEFT JOIN tipo_cancha tc ON ch.tipo_cancha_id = tc.id JOIN cliente cl ON r.cliente_dni = cl.dni")
    if cancha_id:
        q = base + " WHERE r.cancha_id = ? ORDER BY r.fecha"
        rows = fetchall(q, (cancha_id,))
    else:
        q = base + " ORDER BY r.fecha"
        rows = fetchall(q)
    return [_row_to_reserva(r) for r in rows]


def listar_horarios() -> List[Dict[str, Any]]:
    """Retorna la lista global de horarios predefinidos (no ligados a una cancha)."""
    q = "SELECT id, inicio, fin FROM horario ORDER BY inicio"
    rows = fetchall(q)
    return rows


def listar_clientes() -> List[Dict[str, Any]]:
    """Retorna todos los clientes como dicts simples."""
    # cliente table has columns: dni, nombre, telefono
    q = "SELECT dni, nombre, telefono FROM cliente ORDER BY dni"
    rows = fetchall(q)
    return rows


def calcular_ingresos(fecha_inicio_iso: str, fecha_fin_iso: str) -> float:
    q = "SELECT SUM(p.monto) AS total FROM pago p JOIN reserva r ON p.reserva_id = r.id WHERE p.fecha >= ? AND p.fecha <= ?"
    row = fetchone(q, (fecha_inicio_iso, fecha_fin_iso))
    return float(row['total']) if row and row['total'] is not None else 0.0


def registrar_pago(pago: Dict[str, Any]) -> int:
    q = "INSERT INTO pago (reserva_id, metodo_pago_id, monto) VALUES (?, ?, ?)"
    return execute(q, (pago['reserva_id'], pago['metodo_pago_id'], pago['monto']))
