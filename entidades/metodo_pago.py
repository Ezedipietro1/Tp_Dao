class MetodoPago:
    def __init__(self, id: int, nombre: str):
        self._id = int(id)
        self._nombre = nombre

    def get_id(self) -> int:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_nombre(self) -> str:
        return self._nombre

    def set_nombre(self, value: str):
        self._nombre = str(value)

    def __repr__(self):
        return f"MetodoPago(id={self._id}, nombre={self._nombre!r})"
