class CanchaXServicio:
    def __init__(self, cancha_id: int, servicio_id: int):
        self._cancha_id = int(cancha_id)
        self._servicio_id = int(servicio_id)

    def get_cancha_id(self) -> int:
        return self._cancha_id

    def set_cancha_id(self, value: int):
        self._cancha_id = int(value)

    def get_servicio_id(self) -> int:
        return self._servicio_id

    def set_servicio_id(self, value: int):
        self._servicio_id = int(value)

    def __repr__(self):
        return f"CanchaXServicio(cancha_id={self._cancha_id}, servicio_id={self._servicio_id})"
