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
from TP_Canchas.entidades.horario import Horario
from TP_Canchas.entidades.tipo_cancha import TipoCancha
from TP_Canchas.entidades.estado import Estado


def _row_to_cancha(row: Dict[str, Any]) -> Cancha:
    # row may contain id, nombre, precio_por_hora, tipo_cancha_id, estado_id, tipo_cancha (nombre), estado (nombre)
    tipo_obj = None
    estado_obj = None
    if row.get('tipo_cancha') or row.get('tipo_cancha_id'):
        tipo_obj = TipoCancha(id=row.get('tipo_cancha_id'), nombre=row.get('tipo_cancha'))
    if row.get('estado') or row.get('estado_id'):
        estado_obj = Estado(id=row.get('estado_id'), nombre=row.get('estado'))
    c = Cancha(id=row.get('id'), tipo=tipo_obj, precio=row.get('precio_por_hora'), estado=estado_obj)
    # attach extra attributes for convenience
    try:
        c.nombre = row.get('nombre')
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
    # Build Cliente object from available cliente fields
    cliente_obj = None
    if row.get('cliente_dni') or row.get('cliente_nombre'):
        cliente_obj = Cliente(id=row.get('cliente_id'), dni=row.get('cliente_dni'), nombre=row.get('cliente_nombre'), apellido=row.get('cliente_apellido'), email=row.get('cliente_email'), telefono=row.get('cliente_telefono'))
    # Build Cancha object (minimal) from reserva join
    cancha_obj = None
    if row.get('cancha_id'):
        cancha_obj = Cancha(id=row.get('cancha_id'))
        try:
            cancha_obj.nombre = row.get('cancha_nombre')
        except Exception:
            pass

    # Reserva doesn't reference a horario row in the current schema; horario remains optional
    r = Reserva(id=row.get('id'), cliente=cliente_obj, cancha=cancha_obj, horario=None, precio_final=row.get('precio'), fecha=fecha)
    try:
        r.cancha_nombre = row.get('cancha_nombre')
        # expose cliente attrs for convenience
        if cliente_obj:
            r.cliente_nombre = cliente_obj.get_nombre()
            r.cliente_apellido = cliente_obj.get_apellido()
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
    # select cliente details so we can hydrate a Cliente object
    base = "SELECT r.*, c.nombre AS cancha_nombre, cl.id AS cliente_id, cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido, cl.dni AS cliente_dni, cl.telefono AS cliente_telefono, cl.email AS cliente_email FROM reserva r JOIN cancha c ON r.cancha_id = c.id JOIN cliente cl ON r.cliente_id = cl.id"
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
