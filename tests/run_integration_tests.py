import importlib
import sys
import os

# Ensure project root is on sys.path so 'TP_Canchas' package can be imported
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
# Also add parent of ROOT so 'TP_Canchas' package can be imported when loading tests by path
PARENT = os.path.abspath(os.path.join(ROOT, '..'))
if PARENT not in sys.path:
    sys.path.insert(0, PARENT)
import importlib.util


failed = False

# Load test_integration module directly from file to avoid package import issues
ti_path = os.path.join(ROOT, 'tests', 'test_integration.py')
spec = importlib.util.spec_from_file_location('test_integration', ti_path)
test_integration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(test_integration)

print('Setting up test module...')
try:
    test_integration.setup_module(None)
except Exception as e:
    print('Setup failed:', e)
    sys.exit(1)

# Quick DB sanity check: list tables
db_path = os.environ.get('TPC_DB_PATH')
if db_path:
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        print('DB tables:', tables)
        conn.close()
    except Exception as e:
        print('DB inspection error:', e)
else:
    print('No TPC_DB_PATH set in environment')

# Ensure TP_Canchas.db.connection.DEFAULT_DB points to the test DB so repositorio uses it
try:
    import TP_Canchas.db.connection as connmod
    if db_path:
        connmod.DEFAULT_DB = db_path
        print('Set TP_Canchas.db.connection.DEFAULT_DB ->', connmod.DEFAULT_DB)
except Exception as e:
    print('Could not set DEFAULT_DB on connection module:', e)

tests = [
    test_integration.test_listar_canchas_returns_cancha_instances,
    test_integration.test_crear_reserva_por_dni_and_listar,
    test_integration.test_registrar_pago_and_calcular_ingresos,
]

# Load API endpoint tests as well
api_path = os.path.join(ROOT, 'tests', 'test_api_endpoints.py')
spec2 = importlib.util.spec_from_file_location('test_api_endpoints', api_path)
test_api_endpoints = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(test_api_endpoints)

tests += [
    test_api_endpoints.test_post_reserva_by_dni,
    test_api_endpoints.test_conflict_on_overlap,
]

for t in tests:
    name = t.__name__
    print(f'Running {name}...')
    try:
        t()
        print('  OK')
    except AssertionError as ae:
        print('  FAILED assertion:', ae)
        failed = True
    except Exception as e:
        print('  ERROR:', type(e).__name__, e)
        failed = True

print('Tearing down...')
try:
    test_integration.teardown_module(None)
except Exception as e:
    print('Teardown error:', e)

if failed:
    print('Some tests failed')
    sys.exit(2)
else:
    print('All tests passed')
    sys.exit(0)
