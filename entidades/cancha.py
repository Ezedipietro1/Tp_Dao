from typing import Optional
from TP_Canchas.entidades.tipo_cancha import TipoCancha
from TP_Canchas.entidades.estado import Estado


class Cancha:
    def __init__(self, id: Optional[int] = None, tipo: Optional[TipoCancha] = None, precio: Optional[float] = None, estado: Optional[Estado] = None):
        self._id = int(id) if id is not None else None
        self._tipo = tipo
        self._precio = None if precio is None else float(precio)
        self._estado = estado

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_tipo(self) -> Optional[TipoCancha]:
        return self._tipo

    def set_tipo(self, tipo: TipoCancha):
        self._tipo = tipo

    def get_tipo_id(self) -> Optional[int]:
        return self._tipo.get_id() if self._tipo else None

    def get_precio(self) -> Optional[float]:
        return self._precio

    def set_precio(self, value: float):
        self._precio = None if value is None else float(value)

    def get_estado(self) -> Optional[Estado]:
        return self._estado

    def set_estado(self, estado: Estado):
        self._estado = estado

    def get_estado_id(self) -> Optional[int]:
        return self._estado.get_id() if self._estado else None

    def __repr__(self):
        return f"Cancha(id={self._id}, tipo={self._tipo!r}, precio={self._precio}, estado={self._estado!r})"
