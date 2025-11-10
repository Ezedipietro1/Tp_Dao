
from datetime import date
from typing import Optional
from TP_Canchas.entidades.reserva import Reserva
from TP_Canchas.entidades.metodo_pago import MetodoPago
from TP_Canchas.entidades.estado import Estado


class Pago:
    def __init__(self, id: Optional[int] = None, fecha_pago: Optional[date] = None, monto: Optional[float] = None, metodo_pago: Optional[MetodoPago] = None, estado: Optional[Estado] = None, estado_pago_id: Optional[int] = None, reserva: Optional[Reserva] = None):
        self._id = id
        self._fecha_pago = fecha_pago
        self._monto = None if monto is None else float(monto)
        self._metodo_pago = metodo_pago
        # estado may be provided as Estado object or as an id for compatibility
        if estado is not None:
            self._estado = estado
        elif estado_pago_id is not None:
            self._estado = Estado(id=estado_pago_id)
        else:
            self._estado = None
        self._reserva = reserva

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_fecha_pago(self) -> Optional[date]:
        return self._fecha_pago

    def set_fecha_pago(self, value):
        if isinstance(value, str):
            self._fecha_pago = date.fromisoformat(value)
        else:
            self._fecha_pago = value

    def get_monto(self) -> Optional[float]:
        return self._monto

    def set_monto(self, value: float):
        self._monto = None if value is None else float(value)

    def get_metodo_pago(self) -> Optional[MetodoPago]:
        return self._metodo_pago

    def set_metodo_pago(self, m: MetodoPago):
        self._metodo_pago = m

    def get_metodo_pago_id(self) -> Optional[int]:
        return self._metodo_pago.get_id() if self._metodo_pago else None

    def get_estado(self) -> Optional[Estado]:
        return self._estado

    def set_estado(self, e: Estado):
        self._estado = e

    def get_estado_pago_id(self) -> Optional[int]:
        return self._estado.get_id() if self._estado else None

    def set_estado_pago_id(self, value: int):
        # compatibility setter: replace or create Estado with given id
        self._estado = Estado(id=int(value))

    def get_reserva(self) -> Optional[Reserva]:
        return self._reserva

    def set_reserva(self, r: Reserva):
        self._reserva = r

    def get_reserva_id(self) -> Optional[int]:
        return self._reserva.get_id() if self._reserva else None

    def __repr__(self):
        return f"Pago(id={self._id}, fecha_pago={self._fecha_pago}, monto={self._monto}, reserva={self._reserva!r})"
