from flask import Flask, jsonify, request
try:
    from flask_cors import CORS
except Exception:
    CORS = None
import repositorio

app = Flask(__name__)
if CORS:
    CORS(app)


@app.route('/canchas', methods=['GET'])
def api_listar_canchas():
    data = repositorio.listar_canchas()
    # ensure JSON serializable: convert entity objects to plain dicts
    def cancha_to_dict(c):
        try:
            # if it's already a dict
            if isinstance(c, dict):
                return c
            # try common accessor methods
            return {
                'id': c.get_id() if hasattr(c, 'get_id') else getattr(c, 'id', None),
                'nombre': getattr(c, 'nombre', None),
                'precio_por_hora': c.get_precio() if hasattr(c, 'get_precio') else getattr(c, 'precio_por_hora', None),
                'tipo_cancha_id': c.get_tipo_id() if hasattr(c, 'get_tipo_id') else getattr(c, 'tipo_cancha_id', None),
                'estado_id': c.get_estado_id() if hasattr(c, 'get_estado_id') else getattr(c, 'estado_id', None),
            }
        except Exception:
            return {}

    return jsonify([cancha_to_dict(c) for c in data])


@app.route('/canchas/<int:cancha_id>/disponibilidad', methods=['GET'])
def api_disponibilidad(cancha_id):
    inicio = request.args.get('inicio')
    fin = request.args.get('fin')
    if not inicio or not fin:
        return jsonify({'error': 'Debe pasar parametros inicio y fin en formato ISO'}), 400
    ok = repositorio.verificar_disponibilidad(cancha_id, inicio, fin)
    return jsonify({'cancha_id': cancha_id, 'disponible': ok})


@app.route('/canchas/<int:cancha_id>/horarios', methods=['GET'])
def api_listar_horarios(cancha_id):
    # horarios ahora son globales (no ligados a cancha). Mantener ruta antigua pero
    # ignorar cancha_id para compatibilidad y devolver la lista global.
    try:
        hs = repositorio.listar_horarios()
        return jsonify(hs)
    except Exception as e:
        return jsonify({'error': 'Error al obtener horarios', 'detail': str(e)}), 500


@app.route('/horarios', methods=['GET'])
def api_listar_horarios_global():
    try:
        hs = repositorio.listar_horarios()
        return jsonify(hs)
    except Exception as e:
        return jsonify({'error': 'Error al obtener horarios', 'detail': str(e)}), 500


@app.route('/clientes', methods=['GET'])
def api_listar_clientes():
    try:
        cs = repositorio.listar_clientes()
        return jsonify(cs)
    except Exception as e:
        return jsonify({'error': 'Error al obtener clientes', 'detail': str(e)}), 500


@app.route('/reservas', methods=['GET'])
def api_listar_reservas():
    try:
        cancha_id = request.args.get('cancha_id', type=int)
        cliente_dni = request.args.get('cliente_dni')
        reservas = repositorio.listar_reservas(cancha_id if cancha_id else None)
        # filter by cliente_dni if provided
        if cliente_dni:
            reservas = [r for r in reservas if (getattr(r, 'cliente', None) and (hasattr(r.cliente, 'get_dni') and r.cliente.get_dni() == cliente_dni)) or getattr(r, 'cliente_dni', None) == cliente_dni]

        def reserva_to_dict(r):
            try:
                fecha = r.get_fecha()
                fecha_iso = fecha.isoformat() if fecha else None
            except Exception:
                fecha_iso = None
            return {
                'id': r.get_id() if hasattr(r, 'get_id') else getattr(r, 'id', None),
                'cancha_id': r.get_cancha_id() if hasattr(r, 'get_cancha_id') else getattr(r, 'cancha', {}).get('id', None) if isinstance(getattr(r, 'cancha', None), dict) else getattr(r, 'cancha', None).id if getattr(r, 'cancha', None) else None,
                'cancha_nombre': getattr(r, 'cancha_nombre', None),
                'cliente_dni': getattr(r, 'cliente', None).get_dni() if getattr(r, 'cliente', None) and hasattr(r.cliente, 'get_dni') else getattr(r, 'cliente_dni', None),
                'cliente_nombre': getattr(r, 'cliente_nombre', None),
                'inicio': getattr(r, 'inicio', None),
                'fin': getattr(r, 'fin', None),
                'precio': r.get_precio_final() if hasattr(r, 'get_precio_final') else getattr(r, 'precio_final', None),
                'fecha': fecha_iso,
            }

        return jsonify([reserva_to_dict(r) for r in reservas])
    except Exception as e:
        return jsonify({'error': 'Error al obtener reservas', 'detail': str(e)}), 500


@app.route('/reservas', methods=['POST'])
def api_crear_reserva():
    payload = request.get_json()
    required = ['cancha_id', 'cliente_dni', 'inicio', 'fin', 'precio']
    if not payload:
        return jsonify({'error': 'Body JSON requerido'}), 400

    # Require cliente_dni as the identifier for cliente
    if 'cliente_dni' not in payload:
        return jsonify({'error': 'Se requiere cliente_dni'}), 400

    # Validate basic fields
    if 'cancha_id' not in payload or 'inicio' not in payload or 'fin' not in payload or 'precio' not in payload:
        return jsonify({'error': 'Faltan campos en el body. Se requieren: cancha_id, inicio, fin, precio y cliente_dni'}), 400

    cancha_id = payload['cancha_id']
    inicio = payload['inicio']
    fin = payload['fin']
    precio = payload['precio']

    # verificar disponibilidad
    if not repositorio.verificar_disponibilidad(cancha_id, inicio, fin):
        return jsonify({'error': 'Cancha no disponible en el periodo solicitado'}), 409

    try:
        # Use DNI-based creation (will create cliente if missing)
        rid = repositorio.crear_reserva_por_dni(payload)
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Error interno al crear la reserva', 'detail': str(e)}), 500

    return jsonify({'reserva_id': rid}), 201


@app.route('/reservas/<int:reserva_id>/cancel', methods=['POST'])
def api_cancelar_reserva(reserva_id):
    repositorio.cancelar_reserva(reserva_id)
    return jsonify({'reserva_id': reserva_id, 'status': 'cancelada'})


@app.route('/pagos', methods=['POST'])
def api_registrar_pago():
    payload = request.get_json()
    required = ['reserva_id', 'metodo_pago_id', 'monto']
    if not payload or not all(k in payload for k in required):
        return jsonify({'error': 'Faltan campos en el body. Se requieren: ' + ','.join(required)}), 400
    pid = repositorio.registrar_pago(payload)
    return jsonify({'pago_id': pid}), 201


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
