from typing import Optional


class Servicio:
    def __init__(self, id: Optional[int] = None, nombre: str = "", precio: float = 0.0):
        self._id = id
        self._nombre = nombre
        self._precio = float(precio)

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_nombre(self) -> str:
        return self._nombre

    def set_nombre(self, value: str):
        self._nombre = str(value)

    def get_precio(self) -> float:
        return self._precio

    def set_precio(self, value: float):
        self._precio = float(value)

    def __repr__(self):
        return f"Servicio(id={self._id}, nombre={self._nombre!r}, precio={self._precio})"
