from datetime import date
from typing import Optional
from TP_Canchas.entidades.cliente import Cliente
from TP_Canchas.entidades.cancha import Cancha
from TP_Canchas.entidades.horario import Horario


class Reserva:
    def __init__(self, id: Optional[int] = None, cliente: Optional[Cliente] = None, cancha: Optional[Cancha] = None, horario: Optional[Horario] = None, precio_final: Optional[float] = None, fecha: Optional[date] = None):
        self._id = id
        self._cliente = cliente
        self._cancha = cancha
        self._horario = horario
        self._precio_final = None if precio_final is None else float(precio_final)
        self._fecha = fecha

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_cliente(self) -> Optional[Cliente]:
        return self._cliente

    def set_cliente(self, cliente: Cliente):
        self._cliente = cliente

    def get_cliente_dni(self) -> Optional[str]:
        if self._cliente:
            return self._cliente.get_dni()
        return None

    def get_cancha(self) -> Optional[Cancha]:
        return self._cancha

    def set_cancha(self, c: Cancha):
        self._cancha = c

    def get_cancha_id(self) -> Optional[int]:
        return self._cancha.get_id() if self._cancha else None

    def get_horario(self) -> Optional[Horario]:
        return self._horario

    def set_horario(self, h: Horario):
        self._horario = h

    def get_horario_id(self) -> Optional[int]:
        return self._horario.get_id() if self._horario else None

    def get_precio_final(self) -> Optional[float]:
        return self._precio_final

    def set_precio_final(self, value: float):
        self._precio_final = None if value is None else float(value)

    def get_fecha(self) -> Optional[date]:
        return self._fecha

    def set_fecha(self, value):
        if isinstance(value, str):
            self._fecha = date.fromisoformat(value)
        else:
            self._fecha = value

    def __repr__(self):
        return f"Reserva(id={self._id}, cliente={self._cliente!r}, cancha={self._cancha!r}, horario={self._horario!r}, precio_final={self._precio_final}, fecha={self._fecha})"
