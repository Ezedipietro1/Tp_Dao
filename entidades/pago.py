
from datetime import date
from entidades.reserva import Reserva
from entidades.metodo_pago import MetodoPago
from entidades.estado import Estado


class Pago:
    def __init__(self, id: int, fecha_pago: date, metodo_pago: MetodoPago, estado: Estado, reserva: Reserva):
        self._id = int(id)
        # normalize fecha_pago if string provided
        if isinstance(fecha_pago, str):
            self._fecha_pago = date.fromisoformat(fecha_pago)
        else:
            self._fecha_pago = fecha_pago
        self._monto = self._reserva.get_precio_final()
        self._metodo_pago = metodo_pago
        self._estado = estado
        self._reserva = reserva

    def get_id(self) -> int:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_fecha_pago(self) -> date:
        return self._fecha_pago

    def set_fecha_pago(self, value):
        if isinstance(value, str):
            self._fecha_pago = date.fromisoformat(value)
        else:
            self._fecha_pago = value

    def get_monto(self) -> float:
        return self._monto

    def set_monto(self, value: float):
        self._monto = float(value)

    def get_metodo_pago(self) -> MetodoPago:
        return self._metodo_pago

    def set_metodo_pago(self, m: MetodoPago):
        self._metodo_pago = m

    def get_metodo_pago_id(self) -> int:
        return self._metodo_pago.get_id()

    def get_estado(self) -> Estado:
        return self._estado

    def set_estado(self, e: Estado):
        self._estado = e

    def get_estado_pago_id(self) -> int:
        return self._estado.get_id()

    def set_estado_pago_id(self, value: int):
        # compatibility setter: replace or create Estado with given id
        self._estado = Estado(id=int(value), nombre='', ambito='')

    def get_reserva(self) -> Reserva:
        return self._reserva

    def set_reserva(self, r: Reserva):
        self._reserva = r

    def get_reserva_id(self) -> int:
        return self._reserva.get_id()

    def __repr__(self):
        return f"Pago(id={self._id}, fecha_pago={self._fecha_pago}, monto={self._monto}, reserva={self._reserva!r})"
