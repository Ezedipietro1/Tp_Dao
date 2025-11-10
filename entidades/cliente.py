from typing import Optional


class Cliente:
    def __init__(self, id: Optional[int] = None, dni: Optional[str] = None, nombre: Optional[str] = None, apellido: Optional[str] = None, email: Optional[str] = None, telefono: Optional[str] = None):
        self._id = int(id) if id is not None else None
        self._dni = str(dni) if dni is not None else None
        self._nombre = nombre
        self._apellido = apellido
        self._email = email
        self._telefono = telefono

    def get_id(self) -> Optional[int]:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_dni(self) -> Optional[str]:
        return self._dni

    def set_dni(self, value: str):
        self._dni = str(value)

    def get_nombre(self) -> Optional[str]:
        return self._nombre

    def set_nombre(self, value: str):
        self._nombre = str(value)

    def get_apellido(self) -> Optional[str]:
        return self._apellido

    def set_apellido(self, value: str):
        self._apellido = str(value)

    def get_email(self) -> Optional[str]:
        return self._email

    def set_email(self, value: str):
        self._email = str(value)

    def get_telefono(self) -> Optional[str]:
        return self._telefono

    def set_telefono(self, value: str):
        self._telefono = str(value)

    def __repr__(self):
        return f"Cliente(id={self._id!r}, dni={self._dni!r}, nombre={self._nombre!r}, apellido={self._apellido!r})"
