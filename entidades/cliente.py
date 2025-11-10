from typing import Optional


class Cliente:
    def __init__(self, dni: str, nombre: str, telefono: str):
        self._dni = str(dni)
        self._nombre = nombre
        self._telefono = telefono

    def get_dni(self) -> str:
        return self._dni

    def set_dni(self, value: str):
        self._dni = str(value)

    def get_nombre(self) -> str:
        return self._nombre

    def set_nombre(self, value: str):
        self._nombre = str(value)

    def get_telefono(self) -> str:
        return self._telefono

    def set_telefono(self, value: str):
        self._telefono = str(value)

    def __repr__(self):
        return f"Cliente(dni={self._dni!r}, nombre={self._nombre!r}, telefono={self._telefono!r})"
