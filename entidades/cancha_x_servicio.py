from typing import Optional
from TP_Canchas.entidades.cancha import Cancha
from TP_Canchas.entidades.servicio import Servicio


class CanchaXServicio:
    def __init__(self, cancha: Optional[Cancha] = None, servicio: Optional[Servicio] = None):
        self._cancha = cancha
        self._servicio = servicio

    def get_cancha(self) -> Optional[Cancha]:
        return self._cancha

    def set_cancha(self, c: Cancha):
        self._cancha = c

    def get_cancha_id(self) -> Optional[int]:
        return self._cancha.get_id() if self._cancha else None

    def get_servicio(self) -> Optional[Servicio]:
        return self._servicio

    def set_servicio(self, s: Servicio):
        self._servicio = s

    def get_servicio_id(self) -> Optional[int]:
        return self._servicio.get_id() if self._servicio else None

    def __repr__(self):
        return f"CanchaXServicio(cancha={self._cancha!r}, servicio={self._servicio!r})"
