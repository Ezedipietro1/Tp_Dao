from typing import Dict, Any, Optional, List
from db.connection import fetchone, execute, fetchall


def get_cliente_por_dni(dni: str) -> Optional[Dict[str, Any]]:
    q = "SELECT dni, nombre, telefono FROM cliente WHERE dni = ?"
    return fetchone(q, (dni,))


def crear_cliente(cliente: Dict[str, Any]) -> int:
    q = "INSERT INTO cliente (dni, nombre, telefono) VALUES (?, ?, ?)"
    return execute(q, (cliente.get('dni'), cliente.get('nombre'), cliente.get('telefono')))


def listar_clientes() -> List[Dict[str, Any]]:
    q = "SELECT dni, nombre, telefono FROM cliente ORDER BY dni"
    return fetchall(q)

def actualizar_cliente(dni: str, cliente: Dict[str, Any]) -> int:
    q = "UPDATE cliente SET nombre = ?, telefono = ? WHERE dni = ?"
    return execute(q, (cliente.get('nombre'), cliente.get('telefono'), dni))