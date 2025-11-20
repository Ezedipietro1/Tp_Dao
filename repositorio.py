"""Facade `repositorio` module that delegates to domain-specific repos in `Repositorios/`.

This keeps the existing public API while moving implementation into
`Repositorios/CanchasRepo.py`, `Repositorios/ReservasRepo.py`, and
`Repositorios/ClientesRepo.py` as requested.
"""

from Repositorios.CanchasRepo import listar_canchas, obtener_cancha, crear_cancha, actualizar_cancha, eliminar_cancha, buscar_canchas, listar_servicios
from Repositorios.CanchasRepo import listar_tipos
from Repositorios.ClientesRepo import get_cliente_por_dni, crear_cliente, listar_clientes
from Repositorios.ClientesRepo import actualizar_cliente, eliminar_cliente
from Repositorios.ReservasRepo import (
    _row_to_reserva,
    crear_reserva,
    crear_reserva_por_dni,
    verificar_disponibilidad,
    verificar_disponibilidad_por_horario,
    cancelar_reserva,
    obtener_reserva,
    actualizar_reserva,
    listar_reservas,
    listar_horarios,
    calcular_ingresos,
    registrar_pago,
)

__all__ = [
    'listar_canchas', 'obtener_cancha',
    'crear_cancha', 'actualizar_cancha', 'eliminar_cancha', 'buscar_canchas',
    'listar_servicios',
    'listar_tipos',
    'get_cliente_por_dni', 'crear_cliente', 'listar_clientes',
    'actualizar_cliente', 'eliminar_cliente',
    'crear_reserva', 'crear_reserva_por_dni', 'verificar_disponibilidad', 'verificar_disponibilidad_por_horario', 'cancelar_reserva', 'obtener_reserva', 'actualizar_reserva', 'listar_reservas', 'listar_horarios', 'calcular_ingresos', 'registrar_pago'
]
