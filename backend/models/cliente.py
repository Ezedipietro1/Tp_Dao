class Cliente:
    def __init__(self, dni: str, nombre: str, apellido: str, email: str, telefono: str):
        self._dni = str(dni)
        self._nombre = nombre
        self._apellido = apellido
        self._email = email
        self._telefono = telefono

    def get_dni(self) -> str:
        return self._dni

    def set_dni(self, value: str):
        self._dni = str(value)

    def get_nombre(self) -> str:
        return self._nombre

    def set_nombre(self, value: str):
        self._nombre = str(value)

    def get_apellido(self) -> str:
        return self._apellido

    def set_apellido(self, value: str):
        self._apellido = str(value)

    def get_email(self) -> str:
        return self._email

    def set_email(self, value: str):
        self._email = str(value)

    def get_telefono(self) -> str:
        return self._telefono

    def set_telefono(self, value: str):
        self._telefono = str(value)

    def __repr__(self):
        return f"Cliente(dni={self._dni!r}, nombre={self._nombre!r}, apellido={self._apellido!r})"
