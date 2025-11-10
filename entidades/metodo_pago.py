from typing import Optional


class MetodoPago:
    def __init__(self, id: Optional[int] = None, nombre: str = "", descripcion: str = ""):
        self._id = id
        self._nombre = nombre
        self._descripcion = descripcion

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_nombre(self) -> str:
        return self._nombre

    def set_nombre(self, value: str):
        self._nombre = str(value)

    def get_descripcion(self) -> str:
        return self._descripcion

    def set_descripcion(self, value: str):
        self._descripcion = str(value)

    def __repr__(self):
        return f"MetodoPago(id={self._id}, nombre={self._nombre!r})"
