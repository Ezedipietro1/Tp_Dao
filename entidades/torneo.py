from datetime import date
from typing import Optional


class Torneo:
    def __init__(self, id: Optional[int] = None, fecha: Optional[date] = None, ganador: Optional[str] = None, reserva_id: Optional[int] = None):
        self._id = id
        self._fecha = fecha
        self._ganador = ganador
        self._reserva_id = reserva_id

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

    def get_reserva_id(self) -> Optional[int]:
        return self._reserva_id

    def set_reserva_id(self, value: int):
        self._reserva_id = int(value)

    def __repr__(self):
        return f"Torneo(id={self._id}, fecha={self._fecha}, ganador={self._ganador!r}, reserva_id={self._reserva_id})"
