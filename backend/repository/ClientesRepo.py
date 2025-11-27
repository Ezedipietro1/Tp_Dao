from typing import Dict, Any, Optional, List
from db.connection import fetchone, execute, fetchall


def get_cliente_por_dni(dni: str) -> Optional[Dict[str, Any]]:
    q = "SELECT dni, nombre, telefono FROM cliente WHERE dni = ?"
    return fetchone(q, (dni,))


def crear_cliente(cliente: Dict[str, Any]) -> int:
    q = "INSERT INTO cliente (dni, nombre, telefono) VALUES (?, ?, ?)"
    return execute(q, (cliente.get('dni'), cliente.get('nombre'), cliente.get('telefono')))


def listar_clientes(nombre: str = None) -> List[Dict[str, Any]]:
    if nombre and str(nombre).strip() != "":
        # Perform case-insensitive partial match on nombre
        q = "SELECT dni, nombre, telefono FROM cliente WHERE lower(nombre) LIKE ? ORDER BY nombre"
        param = ('%' + str(nombre).lower() + '%',)
        return fetchall(q, param)
    q = "SELECT dni, nombre, telefono FROM cliente ORDER BY dni"
    return fetchall(q)

def actualizar_cliente(dni: str, cliente: Dict[str, Any]) -> int:
    # Do not allow changing the DNI (primary key) here. Only update nombre and telefono.
    nombre = cliente.get('nombre')
    telefono = cliente.get('telefono')
    q = "UPDATE cliente SET nombre = ?, telefono = ? WHERE dni = ?"
    return execute(q, (nombre, telefono, dni))


def eliminar_cliente(dni: str) -> int:
    # Prevent deletion if there are dependent reservas
    q_check = "SELECT COUNT(1) as cnt FROM reserva WHERE cliente_dni = ?"
    row = fetchone(q_check, (dni,))
    if row and row.get('cnt', 0) > 0:
        raise ValueError(f"No se puede eliminar cliente {dni}: existen reservas asociadas")
    q = "DELETE FROM cliente WHERE dni = ?"
    return execute(q, (dni,))