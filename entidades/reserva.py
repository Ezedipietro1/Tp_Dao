from datetime import date
from typing import Optional


class Reserva:
    def __init__(self, id: Optional[int] = None, cliente_dni: Optional[str] = None, cancha_id: Optional[int] = None, horario_id: Optional[int] = None, precio_final: Optional[float] = None, fecha: Optional[date] = None):
        self._id = id
        self._cliente_dni = cliente_dni
        self._cancha_id = cancha_id
        self._horario_id = horario_id
        self._precio_final = None if precio_final is None else float(precio_final)
        self._fecha = fecha

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_cliente_dni(self) -> Optional[str]:
        return self._cliente_dni

    def set_cliente_dni(self, value: str):
        self._cliente_dni = str(value)

    def get_cancha_id(self) -> Optional[int]:
        return self._cancha_id

    def set_cancha_id(self, value: int):
        self._cancha_id = int(value)

    def get_horario_id(self) -> Optional[int]:
        return self._horario_id

    def set_horario_id(self, value: int):
        self._horario_id = int(value)

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
        return f"Reserva(id={self._id}, cliente_dni={self._cliente_dni!r}, cancha_id={self._cancha_id}, horario_id={self._horario_id}, precio_final={self._precio_final}, fecha={self._fecha})"
