"""
Package `entidades` symbols.

Avoid importing submodules at package import time to prevent circular imports.
Import specific classes from submodules directly where needed, e.g.:

    from TP_Canchas.entidades.cancha import Cancha

This module only exposes the names list for convenience.
"""

__all__ = [
    'Servicio', 'TipoCancha', 'Estado', 'Cancha', 'CanchaXServicio', 'Horario', 'Cliente', 'Reserva', 'Torneo', 'MetodoPago', 'Pago'
]
