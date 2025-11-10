from typing import Optional


class Cancha:
    def __init__(self, id: Optional[int] = None, tipo_id: Optional[int] = None, precio: Optional[float] = None, estado_id: Optional[int] = None):
        self._id = id
        self._tipo_id = tipo_id
        self._precio = None if precio is None else float(precio)
        self._estado_id = estado_id

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_tipo_id(self) -> Optional[int]:
        return self._tipo_id

    def set_tipo_id(self, value: int):
        self._tipo_id = int(value)

    def get_precio(self) -> Optional[float]:
        return self._precio

    def set_precio(self, value: float):
        self._precio = None if value is None else float(value)

    def get_estado_id(self) -> Optional[int]:
        return self._estado_id

    def set_estado_id(self, value: int):
        self._estado_id = int(value)

    def __repr__(self):
        return f"Cancha(id={self._id}, tipo_id={self._tipo_id}, precio={self._precio}, estado_id={self._estado_id})"
