"""Repositorio SQL directo para TP_Canchas (SQLite).
Ahora devuelve instancias de las clases en `TP_Canchas.entidades` cuando es posible.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from TP_Canchas.db.connection import fetchall, fetchone, execute
from TP_Canchas.entidades.cancha import Cancha
from TP_Canchas.entidades.reserva import Reserva
from TP_Canchas.entidades.servicio import Servicio
from TP_Canchas.entidades.cliente import Cliente


def _row_to_cancha(row: Dict[str, Any]) -> Cancha:
    # row may contain id, nombre, precio_por_hora, tipo_cancha_id, estado_id, tipo_cancha (nombre), estado (nombre)
    c = Cancha(id=row.get('id'), tipo_id=row.get('tipo_cancha_id'), precio=row.get('precio_por_hora'), estado_id=row.get('estado_id'))
    # attach extra attributes for convenience
    try:
        c.nombre = row.get('nombre')
        c.tipo_nombre = row.get('tipo_cancha')
        c.estado_nombre = row.get('estado')
    except Exception:
        pass
    return c


def _row_to_reserva(row: Dict[str, Any]) -> Reserva:
    # Map basic fields; Reserva expects fecha as date, set from inicio
    inicio = row.get('inicio')
    fecha = None
    if inicio:
        try:
            fecha = datetime.fromisoformat(inicio).date()
        except Exception:
            fecha = None
    # prefer cliente_dni if available (new schema), otherwise fall back to cliente_id
    cliente_dni = row.get('cliente_dni') or (str(row.get('cliente_id')) if row.get('cliente_id') else None)
    r = Reserva(id=row.get('id'), cliente_dni=cliente_dni, cancha_id=row.get('cancha_id'), horario_id=None, precio_final=row.get('precio'), fecha=fecha)
    try:
        r.cancha_nombre = row.get('cancha_nombre')
        r.cliente_nombre = row.get('cliente_nombre')
        r.cliente_apellido = row.get('cliente_apellido')
    except Exception:
        pass
    return r


def get_cliente_por_dni(dni: str) -> Optional[Dict[str, Any]]:
    q = "SELECT * FROM cliente WHERE dni = ?"
    return fetchone(q, (dni,))


def crear_cliente(cliente: Dict[str, Any]) -> int:
    """cliente dict debe tener: dni, nombre, apellido, email, telefono (email/telefono opcionales)
    Retorna id de cliente.
    """
    q = "INSERT INTO cliente (dni, nombre, apellido, email, telefono) VALUES (?, ?, ?, ?, ?)"
    return execute(q, (cliente.get('dni'), cliente.get('nombre'), cliente.get('apellido'), cliente.get('email'), cliente.get('telefono')))


def crear_reserva_por_dni(reserva: Dict[str, Any]) -> int:
    """Crear reserva usando cliente DNI en lugar de cliente_id. Si el cliente no existe, lo crea.
    reserva dict debe contener: cliente_dni, cancha_id, inicio, fin, precio
    """
    dni = reserva.get('cliente_dni')
    if not dni:
        raise ValueError('cliente_dni es requerido')
    c = get_cliente_por_dni(dni)
    if not c:
        # crear cliente mínimo
        cid = crear_cliente({'dni': dni, 'nombre': reserva.get('cliente_nombre', 'Anonimo'), 'apellido': reserva.get('cliente_apellido', ''), 'email': None, 'telefono': None})
    else:
        cid = c['id']
    payload = {'cancha_id': reserva['cancha_id'], 'cliente_id': cid, 'inicio': reserva['inicio'], 'fin': reserva['fin'], 'precio': reserva['precio']}
    return crear_reserva(payload)


def listar_canchas() -> List[Cancha]:
    q = """
    SELECT c.id, c.nombre, c.precio_por_hora, c.tipo_cancha_id, c.estado_id, tc.nombre AS tipo_cancha, e.nombre AS estado
    FROM cancha c
    LEFT JOIN tipo_cancha tc ON c.tipo_cancha_id = tc.id
    LEFT JOIN estado e ON c.estado_id = e.id
    ORDER BY c.id
    """
    rows = fetchall(q)
    return [_row_to_cancha(r) for r in rows]


def obtener_cancha(cancha_id: int) -> Optional[Cancha]:
    q = """
    SELECT c.*, tc.nombre AS tipo_cancha, e.nombre AS estado
    FROM cancha c
    LEFT JOIN tipo_cancha tc ON c.tipo_cancha_id = tc.id
    LEFT JOIN estado e ON c.estado_id = e.id
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


def crear_reserva(reserva: Dict[str, Any]) -> int:
    """Crear una reserva.
    reserva dict debe contener: cancha_id, cliente_id, inicio (ISO), fin (ISO), precio
    Retorna id de la reserva.
    """
    q = "INSERT INTO reserva (cancha_id, cliente_id, inicio, fin, precio, estado_id) VALUES (?, ?, ?, ?, ?, 1)"
    return execute(q, (reserva['cancha_id'], reserva['cliente_id'], reserva['inicio'], reserva['fin'], reserva['precio']))


def cancelar_reserva(reserva_id: int) -> None:
    q = "UPDATE reserva SET estado_id = 2 WHERE id = ?"
    execute(q, (reserva_id,))


def listar_reservas(cancha_id: Optional[int] = None) -> List[Reserva]:
    base = "SELECT r.*, c.nombre AS cancha_nombre, cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido, cl.dni AS cliente_dni FROM reserva r JOIN cancha c ON r.cancha_id = c.id JOIN cliente cl ON r.cliente_id = cl.id"
    if cancha_id:
        q = base + " WHERE r.cancha_id = ? ORDER BY r.inicio"
        rows = fetchall(q, (cancha_id,))
    else:
        q = base + " ORDER BY r.inicio"
        rows = fetchall(q)
    return [_row_to_reserva(r) for r in rows]


def calcular_ingresos(fecha_inicio_iso: str, fecha_fin_iso: str) -> float:
    q = "SELECT SUM(p.monto) AS total FROM pago p JOIN reserva r ON p.reserva_id = r.id WHERE p.fecha >= ? AND p.fecha <= ?"
    row = fetchone(q, (fecha_inicio_iso, fecha_fin_iso))
    return float(row['total']) if row and row['total'] is not None else 0.0


def registrar_pago(pago: Dict[str, Any]) -> int:
    q = "INSERT INTO pago (reserva_id, metodo_pago_id, monto) VALUES (?, ?, ?)"
    return execute(q, (pago['reserva_id'], pago['metodo_pago_id'], pago['monto']))
