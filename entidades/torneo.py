from datetime import date

class Torneo:
    def __init__(self, id: int, fecha: date):
        self._id = int(id)
        if isinstance(fecha, str):
            self._fecha = date.fromisoformat(fecha)
        else:
            self._fecha = fecha

    def get_id(self) -> int:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_fecha(self) -> date:
        return self._fecha

    def set_fecha(self, value):
        if isinstance(value, str):
            self._fecha = date.fromisoformat(value)
        else:
            self._fecha = value

    def __repr__(self):
        return f"Torneo(id={self._id}, fecha={self._fecha})"