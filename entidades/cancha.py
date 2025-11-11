from entidades.tipo_cancha import TipoCancha
from entidades.servicio import Servicio


class Cancha:
    def __init__(self, id: int, tipo: TipoCancha, servicios: list[Servicio]):
        self._id = int(id)
        self._tipo = tipo
        self._precio = self.calcular_precio()
        self._servicios = servicios
    def get_id(self) -> int:
        return self._id

    def set_id(self, value: int):
        self._id = int(value)

    def get_tipo(self) -> TipoCancha:
        return self._tipo

    def set_tipo(self, tipo: TipoCancha):
        self._tipo = tipo

    def get_tipo_id(self) -> int:
        return self._tipo.get_id()

    def get_precio(self) -> float:
        return self._precio

    def set_precio(self, value: float):
        self._precio = float(value)
    
    def calcular_precio(self) -> float:
        precio_tipo = self._tipo.get_precio()
        precio_servicios = sum(s.get_precio() for s in self._servicios)
        return precio_tipo + precio_servicios
        
    def __repr__(self):
        return f"Cancha(id={self._id}, tipo={self._tipo!r}, precio={self._precio}, estado={self._estado!r})"
