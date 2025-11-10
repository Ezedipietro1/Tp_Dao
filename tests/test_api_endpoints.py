"""API endpoint tests using Flask test client.
These are simple integration-style tests that assume the test runner sets up
the temporary DB and points TP_Canchas.db.connection.DEFAULT_DB to it (see run_integration_tests.py).
"""
try:
    from TP_Canchas.api.app import app
    import TP_Canchas.repositorio as repositorio
    _FLASK_PRESENT = True
except Exception:
    # Flask or app not importable in this environment. Tests will be skipped.
    _FLASK_PRESENT = False


def test_post_reserva_by_dni():
    if not _FLASK_PRESENT:
        print('SKIP test_post_reserva_by_dni: Flask not available')
        return

    client = app.test_client()

    payload = {
        'cancha_id': 1,
        'cliente_dni': 'TESTDNI123',
        'inicio': '2025-11-20T10:00:00',
        'fin': '2025-11-20T11:00:00',
        'precio': 100.0
    }

    # create reservation by dni (cliente will be created if missing)
    resp = client.post('/reservas', json=payload)
    assert resp.status_code == 201, resp.get_data(as_text=True)
    data = resp.get_json()
    assert 'reserva_id' in data

    # verify in repository
    reservas = repositorio.listar_reservas()
    assert any(r.get_id() == data['reserva_id'] for r in reservas)


def test_conflict_on_overlap():
    if not _FLASK_PRESENT:
        print('SKIP test_conflict_on_overlap: Flask not available')
        return

    client = app.test_client()

    base = {
        'cancha_id': 1,
        'cliente_dni': 'OVERLAPDNI',
        'inicio': '2025-11-21T10:00:00',
        'fin': '2025-11-21T11:00:00',
        'precio': 120.0
    }

    r1 = client.post('/reservas', json=base)
    assert r1.status_code == 201, r1.get_data(as_text=True)

    # overlapping reservation should be rejected
    overlap = base.copy()
    overlap['inicio'] = '2025-11-21T10:30:00'
    overlap['fin'] = '2025-11-21T11:30:00'

    r2 = client.post('/reservas', json=overlap)
    assert r2.status_code == 409, r2.get_data(as_text=True)
