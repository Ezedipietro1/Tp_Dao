from datetime import date
from typing import Optional
from TP_Canchas.entidades.reserva import Reserva


class Torneo:
    def __init__(self, id: Optional[int] = None, fecha: Optional[date] = None, ganador: Optional[str] = None, reserva: Optional[Reserva] = None):
        self._id = id
        self._fecha = fecha
        self._ganador = ganador
        self._reserva = reserva

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_fecha(self) -> Optional[date]:
        return self._fecha

    def set_fecha(self, value):
        if isinstance(value, str):
            self._fecha = date.fromisoformat(value)
        else:
            self._fecha = value

    def get_ganador(self) -> Optional[str]:
        return self._ganador

    def set_ganador(self, value: str):
        self._ganador = str(value)

    def get_reserva(self) -> Optional[Reserva]:
        return self._reserva

    def set_reserva(self, r: Reserva):
        self._reserva = r

    def get_reserva_id(self) -> Optional[int]:
        return self._reserva.get_id() if self._reserva else None

    def __repr__(self):
        return f"Torneo(id={self._id}, fecha={self._fecha}, ganador={self._ganador!r}, reserva={self._reserva!r})"
