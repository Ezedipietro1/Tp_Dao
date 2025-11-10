from typing import Optional


class Estado:
    def __init__(self, id: Optional[int] = None, nombre: str = "", ambito: str = ""):
        self._id = id
        self._nombre = nombre
        self._ambito = ambito

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_nombre(self) -> str:
        return self._nombre

    def set_nombre(self, value: str):
        self._nombre = str(value)

    def get_ambito(self) -> str:
        return self._ambito

    def set_ambito(self, value: str):
        self._ambito = str(value)

    def __repr__(self):
        return f"Estado(id={self._id}, nombre={self._nombre!r}, ambito={self._ambito!r})"
