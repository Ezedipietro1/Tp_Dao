import os
import tempfile
from TP_Canchas.db.connection import run_script, DEFAULT_DB, get_connection
from TP_Canchas import repositorio


def setup_module(module):
    # Ensure a clean DB for tests by re-running schema+seed on a temp DB and pointing DEFAULT_DB via env
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
    tmp.close()
    db_path = tmp.name
    # Run schema and seed on temp DB
    run_script(os.path.join(os.path.dirname(__file__), '..', 'db', 'schema.sql'), db_path)
    run_script(os.path.join(os.path.dirname(__file__), '..', 'db', 'seed.sql'), db_path)
    # monkeypatch DEFAULT_DB by environment variable used by connection.get_connection
    os.environ['TPC_DB_PATH'] = db_path


def teardown_module(module):
    # remove temp DB
    db_path = os.environ.get('TPC_DB_PATH')
    try:
        os.remove(db_path)
    except Exception:
        pass


def test_listar_canchas_returns_cancha_instances():
    cs = repositorio.listar_canchas()
    assert isinstance(cs, list)
    assert len(cs) >= 1
    assert hasattr(cs[0], 'get_id')


def test_crear_reserva_por_dni_and_listar():
    # create a reservation using cliente DNI
    dni = 'TESTDNI123'
    # create cliente via repositorio
    cid = repositorio.crear_cliente({'dni': dni, 'nombre': 'Test', 'apellido': 'User', 'email': None, 'telefono': None})
    assert isinstance(cid, int)
    # create reserva
    reserva_payload = {
        'cliente_dni': dni,
        'cancha_id': 1,
        'inicio': '2025-12-01T10:00:00',
        'fin': '2025-12-01T11:00:00',
        'precio': 150.0,
        'cliente_nombre': 'Test',
        'cliente_apellido': 'User'
    }
    rid = repositorio.crear_reserva_por_dni(reserva_payload)
    assert isinstance(rid, int)
    reservas = repositorio.listar_reservas()
    assert any(r.get_cliente_dni() == dni for r in reservas)


def test_registrar_pago_and_calcular_ingresos():
    # assume there's at least one reserva, register a payment and sum
    reservas = repositorio.listar_reservas()
    assert len(reservas) >= 1
    r = reservas[0]
    importe = 123.45
    pid = repositorio.registrar_pago({'reserva_id': r.get_id(), 'metodo_pago_id': 1, 'monto': importe})
    assert isinstance(pid, int)
    total = repositorio.calcular_ingresos('2000-01-01', '2100-01-01')
    assert total >= importe
