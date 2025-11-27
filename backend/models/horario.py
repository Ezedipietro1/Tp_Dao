from datetime import datetime

class Horario:
    def __init__(self, id: int, hora_desde: datetime, hora_hasta: datetime):
        self._id = int(id)
        self._hora_desde = hora_desde
        self._hora_hasta = hora_hasta
    def get_id(self) -> int:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_hora_desde(self) -> datetime:
        return self._hora_desde

    def set_hora_desde(self, value: datetime):
        if isinstance(value, str):
            try:
                # try full ISO parse
                self._hora_desde = datetime.fromisoformat(value)
            except Exception:
                try:
                    # try parsing HH:MM
                    self._hora_desde = datetime.strptime(value, '%H:%M').time()
                except Exception:
                    # fallback: keep raw string
                    self._hora_desde = value
        else:
            self._hora_desde = value

    def get_hora_hasta(self) -> datetime:
        return self._hora_hasta

    def set_hora_hasta(self, value: datetime):
        if isinstance(value, str):
            try:
                self._hora_hasta = datetime.fromisoformat(value)
            except Exception:
                try:
                    self._hora_hasta = datetime.strptime(value, '%H:%M').time()
                except Exception:
                    self._hora_hasta = value
        else:
            self._hora_hasta = value

    def __repr__(self):
        return f"Horario(id={self._id}, hora_desde={self._hora_desde}, hora_hasta={self._hora_hasta})"
