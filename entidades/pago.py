from datetime import date
from typing import Optional


class Pago:
    def __init__(self, id: Optional[int] = None, fecha_pago: Optional[date] = None, monto: Optional[float] = None, metodo_pago_id: Optional[int] = None, estado_pago_id: Optional[int] = None, reserva_id: Optional[int] = None):
        self._id = id
        self._fecha_pago = fecha_pago
        self._monto = None if monto is None else float(monto)
        self._metodo_pago_id = metodo_pago_id
        self._estado_pago_id = estado_pago_id
        self._reserva_id = reserva_id

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

    def get_metodo_pago_id(self) -> Optional[int]:
        return self._metodo_pago_id

    def set_metodo_pago_id(self, value: int):
        self._metodo_pago_id = int(value)

    def get_estado_pago_id(self) -> Optional[int]:
        return self._estado_pago_id

    def set_estado_pago_id(self, value: int):
        self._estado_pago_id = int(value)

    def get_reserva_id(self) -> Optional[int]:
        return self._reserva_id

    def set_reserva_id(self, value: int):
        self._reserva_id = int(value)

    def __repr__(self):
        return f"Pago(id={self._id}, fecha_pago={self._fecha_pago}, monto={self._monto}, reserva_id={self._reserva_id})"
