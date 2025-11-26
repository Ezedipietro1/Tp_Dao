import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from reportes import reporte_reservas_por_cliente, reporte_reservas_por_cancha_en_periodo, reporte_canchas_mas_utilizadas, reporte_reservas_por_canchas_en_periodo
from db.connection import DEFAULT_DB
import tempfile, os

# Generar 3 reportes de prueba
out1 = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
out1.close()
try:
    reporte_reservas_por_cliente(DEFAULT_DB, 12345678, out1.name)
    print('reporte_reservas_por_cliente creado en:', out1.name)
except Exception as e:
    print('ERROR cliente:', repr(e))

out2 = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
out2.close()
try:
    reporte_reservas_por_cancha_en_periodo(DEFAULT_DB, 1, '2020-01-01', '2030-12-31', out2.name)
    print('reporte_reservas_por_cancha_en_periodo creado en:', out2.name)
except Exception as e:
    print('ERROR cancha:', repr(e))

out3 = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
out3.close()
try:
    reporte_canchas_mas_utilizadas(DEFAULT_DB, out3.name, limite=5)
    print('reporte_canchas_mas_utilizadas creado en:', out3.name)
except Exception as e:
    print('ERROR ranking:', repr(e))

out4 = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
out4.close()
try:
    reporte_reservas_por_canchas_en_periodo(DEFAULT_DB, '2020-01-01', '2030-12-31', out4.name)
    print('reporte_reservas_por_canchas_en_periodo creado en:', out4.name)
except Exception as e:
    print('ERROR reservas_por_canchas:', repr(e))

print('\nPrueba finalizada.')