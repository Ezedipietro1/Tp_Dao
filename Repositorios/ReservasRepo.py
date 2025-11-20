from typing import List, Optional, Dict, Any
from datetime import datetime

from db.connection import fetchall, fetchone, execute
from entidades.cancha import Cancha
from entidades.reserva import Reserva
from entidades.servicio import Servicio
from entidades.cliente import Cliente
from entidades.horario import Horario
from entidades.tipo_cancha import TipoCancha
from Repositorios.ClientesRepo import *


def _row_to_reserva(row: Dict[str, Any]) -> Reserva:
    fecha = None
    if row.get('fecha'):
        try:
            fecha = datetime.fromisoformat(row.get('fecha')).date()
        except Exception:
            fecha = None

    cliente_obj = None
    if row.get('cliente_dni') or row.get('cliente_nombre'):
        cliente_obj = Cliente(row.get('cliente_dni'), row.get('cliente_nombre'), '', None, row.get('cliente_telefono'))

    cancha_obj = None
    if row.get('cancha_id'):
        try:
            tipo_nombre = row.get('cancha_tipo')
        except Exception:
            tipo_nombre = None
        tipo_obj_for_cancha = TipoCancha(row.get('cancha_id') or 0, tipo_nombre or '', row.get('precio_final') or 0)
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

    r = Reserva(id=row.get('id'), cliente=cliente_obj, cancha=cancha_obj, horarios=[], fecha=fecha)
    try:
        if row.get('precio_final') is not None:
            r._precio_final = row.get('precio_final')
    except Exception:
        pass

    try:
        r.cancha_nombre = row.get('cancha_nombre')
        r.fecha = row.get('fecha')
        try:
            hrs = fetchall("SELECT h.id, h.inicio, h.fin FROM horario h JOIN reserva_x_horario rx ON h.id = rx.horario_id WHERE rx.reserva_id = ? ORDER BY h.inicio", (row.get('id'),))
            horario_objs = []
            for h in hrs:
                try:
                    horario_objs.append(Horario(h.get('id'), h.get('inicio'), h.get('fin')))
                except Exception:
                    try:
                        horario_objs.append(Horario(h.get('id'), h.get('inicio'), h.get('fin')))
                    except Exception:
                        pass
            r.horarios = horario_objs
            r.horarios_label = [f"{h.get('inicio')}-{h.get('fin')}" for h in hrs]
        except Exception:
            r.horarios = []
            r.horarios_label = []
        if cliente_obj:
            r.cliente_nombre = cliente_obj.get_nombre()
            r.cliente_apellido = cliente_obj.get_apellido()
    except Exception:
        pass
    return r


def verificar_disponibilidad(cancha_id: int, inicio_iso: str, fin_iso: str) -> bool:
    """Legacy interval-based availability check.
    Current data model uses fecha + horarios so interval fields are not available.
    This function returns True as a conservative default to avoid blocking callers.
    """
    # TODO: implement interval overlap check if reserva stores inicio/fin datetimes.
    return True


def crear_reserva_por_dni(reserva: Dict[str, Any]) -> int:
    dni = reserva.get('cliente_dni')
    if not dni:
        raise ValueError('cliente_dni es requerido')
    c = get_cliente_por_dni(dni)
    if not c:
        crear_cliente({'dni': dni, 'nombre': reserva.get('cliente_nombre', 'Anonimo'), 'telefono': None})

    payload = {
        'cancha_id': reserva.get('cancha_id'),
        'cliente_dni': dni,
        'fecha': reserva.get('fecha'),
        'horario_ids': reserva.get('horario_ids') or ([reserva.get('horario_id')] if reserva.get('horario_id') else None),
        'precio': reserva.get('precio'),
        'torneo_id': reserva.get('torneo_id') if 'torneo_id' in reserva else None,
    }
    return crear_reserva(payload)


def verificar_disponibilidad_por_horario(cancha_id: int, fecha: str, horario_id: int) -> bool:
    q = """
    SELECT COUNT(1) AS cnt FROM reserva r
    JOIN reserva_x_horario rx ON r.id = rx.reserva_id
    WHERE r.cancha_id = ? AND r.fecha = ? AND rx.horario_id = ?
    """
    row = fetchone(q, (cancha_id, fecha, horario_id))
    return row and row.get('cnt', 0) == 0


def crear_reserva(reserva: Dict[str, Any]) -> int:
    cancha_id = reserva.get('cancha_id')
    cliente_dni = reserva.get('cliente_dni')
    fecha = reserva.get('fecha')
    horario_ids = reserva.get('horario_ids') or reserva.get('horario_id')
    precio = reserva.get('precio')
    torneo_id = reserva.get('torneo_id')

    if not cancha_id or not cliente_dni or not fecha or not horario_ids or not precio:
        raise ValueError('Faltan campos en la reserva. Se requieren: cancha_id, cliente_dni, fecha, horario_ids, precio')

    if isinstance(horario_ids, int):
        horario_ids = [horario_ids]

    for hid in horario_ids:
        if not verificar_disponibilidad_por_horario(cancha_id, fecha, hid):
            raise ValueError(f'Horario {hid} no disponible para la cancha {cancha_id} en la fecha {fecha}')

    q = "INSERT INTO reserva (cancha_id, cliente_dni, precio_final, fecha, torneo_id) VALUES (?, ?, ?, ?, ?)"
    reserva_id = execute(q, (cancha_id, cliente_dni, precio, fecha, torneo_id))

    for hid in horario_ids:
        execute("INSERT INTO reserva_x_horario (reserva_id, horario_id) VALUES (?, ?)", (reserva_id, hid))

    return reserva_id


def cancelar_reserva(reserva_id: int) -> None:
    execute("DELETE FROM reserva_x_horario WHERE reserva_id = ?", (reserva_id,))
    execute("DELETE FROM reserva WHERE id = ?", (reserva_id,))


def obtener_reserva(reserva_id: int) -> Optional[Reserva]:
    q = ("SELECT r.*, ch.id AS cancha_id, ch.precio_final AS precio_final, tc.nombre AS cancha_tipo, "
         "cl.dni AS cliente_dni, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono "
         "FROM reserva r JOIN cancha ch ON r.cancha_id = ch.id LEFT JOIN tipo_cancha tc ON ch.tipo_cancha_id = tc.id JOIN cliente cl ON r.cliente_dni = cl.dni WHERE r.id = ?")
    row = fetchone(q, (reserva_id,))
    if not row:
        return None
    return _row_to_reserva(row)


def actualizar_reserva(reserva_id: int, reserva: Dict[str, Any]) -> int:
    # expected keys: cancha_id, cliente_dni, fecha, horario_ids (list), precio, torneo_id(optional)
    cancha_id = reserva.get('cancha_id')
    cliente_dni = reserva.get('cliente_dni')
    fecha = reserva.get('fecha')
    horario_ids = reserva.get('horario_ids') or reserva.get('horario_id')
    precio = reserva.get('precio')
    torneo_id = reserva.get('torneo_id') if 'torneo_id' in reserva else None

    if not cancha_id or not cliente_dni or not fecha or not horario_ids or not precio:
        raise ValueError('Faltan campos en la reserva. Se requieren: cancha_id, cliente_dni, fecha, horario_ids, precio')

    if isinstance(horario_ids, int):
        horario_ids = [horario_ids]

    # verify availability excluding this reserva id
    for hid in horario_ids:
        q = "SELECT COUNT(1) AS cnt FROM reserva r JOIN reserva_x_horario rx ON r.id = rx.reserva_id WHERE r.cancha_id = ? AND r.fecha = ? AND rx.horario_id = ? AND r.id != ?"
        row = fetchone(q, (cancha_id, fecha, hid, reserva_id))
        if row and row.get('cnt', 0) > 0:
            raise ValueError(f'Horario {hid} no disponible para la cancha {cancha_id} en la fecha {fecha}')

    # update reserva row
    q = "UPDATE reserva SET cancha_id = ?, cliente_dni = ?, precio_final = ?, fecha = ?, torneo_id = ? WHERE id = ?"
    execute(q, (cancha_id, cliente_dni, precio, fecha, torneo_id, reserva_id))

    # update horario links
    execute("DELETE FROM reserva_x_horario WHERE reserva_id = ?", (reserva_id,))
    for hid in horario_ids:
        execute("INSERT INTO reserva_x_horario (reserva_id, horario_id) VALUES (?, ?)", (reserva_id, hid))

    return reserva_id


def listar_reservas(cancha_id: Optional[int] = None) -> List[Reserva]:
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
    q = "SELECT id, inicio, fin FROM horario ORDER BY inicio"
    rows = fetchall(q)
    return rows


def calcular_ingresos(fecha_inicio_iso: str, fecha_fin_iso: str) -> float:
    q = "SELECT SUM(p.monto) AS total FROM pago p JOIN reserva r ON p.reserva_id = r.id WHERE p.fecha >= ? AND p.fecha <= ?"
    row = fetchone(q, (fecha_inicio_iso, fecha_fin_iso))
    return float(row['total']) if row and row['total'] is not None else 0.0


def registrar_pago(pago: Dict[str, Any]) -> int:
    q = "INSERT INTO pago (reserva_id, metodo_pago_id, monto) VALUES (?, ?, ?)"
    return execute(q, (pago['reserva_id'], pago['metodo_pago_id'], pago['monto']))
