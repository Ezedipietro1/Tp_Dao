from flask import Flask, jsonify, request
try:
    from flask_cors import CORS
except Exception:
    CORS = None
import os, sys
# ensure project root is on sys.path so imports like `import repositorio` work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import repositorio

app = Flask(__name__)
if CORS:
    CORS(app)


@app.route('/canchas', methods=['GET'])
def api_listar_canchas():
    try:
        # support optional filters: tipo_cancha_id, min_precio, max_precio
        tipo_cancha_id = request.args.get('tipo_cancha_id', type=int)
        min_precio = request.args.get('min_precio', type=float)
        max_precio = request.args.get('max_precio', type=float)
        if tipo_cancha_id is not None or min_precio is not None or max_precio is not None:
            filters = {'tipo_cancha_id': tipo_cancha_id, 'min_precio': min_precio, 'max_precio': max_precio}
            data = repositorio.buscar_canchas(filters)
        else:
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
    except Exception as e:
        return jsonify({'error': 'Error al listar canchas', 'detail': str(e)}), 500



@app.route('/canchas', methods=['POST'])
def api_crear_cancha():
    payload = request.get_json()
    if not payload or 'tipo_cancha_id' not in payload:
        return jsonify({'error': 'Body JSON requerido con tipo_cancha_id'}), 400
    # Do not allow client to specify the cancha id (autoincremental)
    if 'id' in payload:
        return jsonify({'error': 'No enviar campo "id" al crear una cancha; será autogenerado'}), 400
    try:
        cid = repositorio.crear_cancha(payload)
        return jsonify({'cancha_id': cid}), 201
    except Exception as e:
        return jsonify({'error': 'Error al crear cancha', 'detail': str(e)}), 500


@app.route('/canchas/<int:cancha_id>', methods=['PUT'])
def api_actualizar_cancha(cancha_id):
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'Body JSON requerido'}), 400
    try:
        repositorio.actualizar_cancha(cancha_id, payload)
        return jsonify({'cancha_id': cancha_id, 'status': 'updated'})
    except Exception as e:
        return jsonify({'error': 'Error al actualizar cancha', 'detail': str(e)}), 500


@app.route('/canchas/<int:cancha_id>', methods=['DELETE'])
def api_eliminar_cancha(cancha_id):
    try:
        repositorio.eliminar_cancha(cancha_id)
        return jsonify({'cancha_id': cancha_id, 'status': 'deleted'})
    except Exception as e:
        return jsonify({'error': 'Error al eliminar cancha', 'detail': str(e)}), 500


@app.route('/canchas/<int:cancha_id>/disponibilidad', methods=['GET'])
def api_disponibilidad(cancha_id):
    inicio = request.args.get('inicio')
    fin = request.args.get('fin')
    if not inicio or not fin:
        return jsonify({'error': 'Debe pasar parametros inicio y fin en formato ISO'}), 400
    ok = repositorio.verificar_disponibilidad(cancha_id, inicio, fin)
    return jsonify({'cancha_id': cancha_id, 'disponible': ok})



@app.route('/canchas/<int:cancha_id>', methods=['GET'])
def api_get_cancha(cancha_id):
    try:
        c = repositorio.obtener_cancha(cancha_id)
        if not c:
            return jsonify({'error': 'Cancha no encontrada'}), 404
        return jsonify(c)
    except Exception as e:
        return jsonify({'error': 'Error al obtener cancha', 'detail': str(e)}), 500


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


@app.route('/canchas/<int:cancha_id>', methods=['GET'])
def api_obtener_cancha(cancha_id):
    try:
        data = repositorio.obtener_cancha(cancha_id)
        if not data:
            return jsonify({'error': 'Cancha no encontrada'}), 404
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': 'Error al obtener cancha', 'detail': str(e)}), 500


@app.route('/servicios', methods=['GET'])
def api_listar_servicios():
    try:
        svs = repositorio.listar_servicios()
        return jsonify(svs)
    except Exception as e:
        return jsonify({'error': 'Error al obtener servicios', 'detail': str(e)}), 500


@app.route('/tipos_cancha', methods=['GET'])
def api_listar_tipos_cancha():
    try:
        tipos = repositorio.listar_tipos()
        return jsonify(tipos)
    except Exception as e:
        return jsonify({'error': 'Error al obtener tipos de cancha', 'detail': str(e)}), 500
    


@app.route('/clientes', methods=['GET'])
def api_listar_clientes():
    try:
        cs = repositorio.listar_clientes()
        return jsonify(cs)
    except Exception as e:
        return jsonify({'error': 'Error al obtener clientes', 'detail': str(e)}), 500


@app.route('/clientes', methods=['POST'])
def api_crear_cliente():
    payload = request.get_json()
    if not payload or 'dni' not in payload or 'nombre' not in payload:
        return jsonify({'error': 'Body JSON requerido con campos: dni, nombre'}), 400
    try:
        repositorio.crear_cliente(payload)
        return jsonify({'dni': payload.get('dni')}), 201
    except Exception as e:
        return jsonify({'error': 'Error al crear cliente', 'detail': str(e)}), 500


@app.route('/clientes/<int:dni>', methods=['GET'])
def api_get_cliente(dni):
    try:
        c = repositorio.get_cliente_por_dni(dni)
        if not c:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        return jsonify(c)
    except Exception as e:
        return jsonify({'error': 'Error al obtener cliente', 'detail': str(e)}), 500


@app.route('/clientes/<int:dni>', methods=['PUT'])
def api_actualizar_cliente(dni):
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'Body JSON requerido'}), 400
    # Do not allow changing DNI via this endpoint
    if 'dni' in payload and str(payload.get('dni')) != str(dni):
        return jsonify({'error': 'No está permitido cambiar el DNI de un cliente'}), 400
    try:
        repositorio.actualizar_cliente(dni, payload)
        # return the updated cliente (try new dni if provided)
        c = repositorio.get_cliente_por_dni(dni)
        return jsonify({'dni': dni, 'status': 'updated', 'cliente': c})
    except Exception as e:
        return jsonify({'error': 'Error al actualizar cliente', 'detail': str(e)}), 500


@app.route('/clientes/<int:dni>', methods=['DELETE'])
def api_eliminar_cliente(dni):
    try:
        repositorio.eliminar_cliente(dni)
        return jsonify({'dni': dni, 'status': 'deleted'})
    except Exception as e:
        return jsonify({'error': 'Error al eliminar cliente', 'detail': str(e)}), 500


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
                fecha_iso = fecha.isoformat() if fecha else getattr(r, 'fecha', None)
            except Exception:
                fecha_iso = getattr(r, 'fecha', None)

            raw_horarios = getattr(r, 'horarios', None) or []
            horarios_out = []
            for h in raw_horarios:
                try:
                    if isinstance(h, dict):
                        horarios_out.append({
                            'id': h.get('id'),
                            'inicio': h.get('inicio'),
                            'fin': h.get('fin')
                        })
                    else:
                        inicio = h.get_hora_desde() if hasattr(h, 'get_hora_desde') else getattr(h, '_hora_desde', None)
                        fin = h.get_hora_hasta() if hasattr(h, 'get_hora_hasta') else getattr(h, '_hora_hasta', None)
                        if hasattr(inicio, 'isoformat'):
                            inicio = inicio.isoformat()
                        if hasattr(fin, 'isoformat'):
                            fin = fin.isoformat()
                        horarios_out.append({
                            'id': h.get_id() if hasattr(h, 'get_id') else getattr(h, '_id', None),
                            'inicio': inicio,
                            'fin': fin
                        })
                except Exception:
                    # skip problematic horario entries
                    pass

            horarios_label = getattr(r, 'horarios_label', None)

            cancha_id = None
            try:
                cancha_id = r.get_cancha_id() if hasattr(r, 'get_cancha_id') else getattr(r, 'cancha_id', None)
            except Exception:
                cancha_id = getattr(r, 'cancha_id', None)

            cliente_dni = None
            try:
                cliente_dni = r.get_cliente_dni() if hasattr(r, 'get_cliente_dni') else getattr(r, 'cliente_dni', None)
            except Exception:
                cliente_dni = getattr(r, 'cliente_dni', None)

            return {
                'id': r.get_id() if hasattr(r, 'get_id') else getattr(r, 'id', None),
                'cancha_id': cancha_id,
                'cancha_nombre': getattr(r, 'cancha_nombre', None),
                'cliente_dni': cliente_dni,
                'cliente_nombre': getattr(r, 'cliente_nombre', None),
                'precio': r.get_precio_final() if hasattr(r, 'get_precio_final') else getattr(r, 'precio_final', None),
                'fecha': fecha_iso,
                'horarios': horarios_out,
                'horarios_label': horarios_label,
            }

        return jsonify([reserva_to_dict(r) for r in reservas])
    except Exception as e:
        return jsonify({'error': 'Error al obtener reservas', 'detail': str(e)}), 500


@app.route('/reservas', methods=['POST'])
def api_crear_reserva():
    payload = request.get_json()
    # Expect: cancha_id, cliente_dni, fecha (YYYY-MM-DD), horario_ids (list or single), precio
    if not payload:
        return jsonify({'error': 'Body JSON requerido'}), 400

    # Require cliente_dni as the identifier for cliente
    if 'cliente_dni' not in payload:
        return jsonify({'error': 'Se requiere cliente_dni'}), 400

    # Validate basic fields (fecha + horario_ids)
    if 'cancha_id' not in payload or 'fecha' not in payload or ('horario_ids' not in payload and 'horario_id' not in payload) or 'precio' not in payload:
        return jsonify({'error': 'Faltan campos en el body. Se requieren: cancha_id, fecha, horario_ids (o horario_id), precio y cliente_dni'}), 400

    try:
        # Use DNI-based creation (will create cliente if missing)
        rid = repositorio.crear_reserva_por_dni(payload)
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Error interno al crear la reserva', 'detail': str(e)}), 500

    return jsonify({'reserva_id': rid}), 201


@app.route('/reservas/<int:reserva_id>', methods=['GET'])
def api_get_reserva(reserva_id):
    try:
        r = repositorio.obtener_reserva(reserva_id)
        if not r:
            return jsonify({'error': 'Reserva no encontrada'}), 404
        # convert Reserva object to dict similar to listar_reservas
        def reserva_to_dict(r):
            try:
                fecha = r.get_fecha()
                fecha_iso = fecha.isoformat() if fecha else getattr(r, 'fecha', None)
            except Exception:
                fecha_iso = getattr(r, 'fecha', None)

            horarios = getattr(r, 'horarios', []) or []
            horarios_out = []
            for h in horarios:
                try:
                    if isinstance(h, dict):
                        horarios_out.append({'id': h.get('id'), 'inicio': h.get('inicio'), 'fin': h.get('fin')})
                    else:
                        horarios_out.append({'id': h.get_id() if hasattr(h, 'get_id') else getattr(h, '_id', None), 'inicio': getattr(h, 'inicio', None) or getattr(h, '_inicio', None), 'fin': getattr(h, 'fin', None) or getattr(h, '_fin', None)})
                except Exception:
                    pass

            return {
                'id': r.get_id() if hasattr(r, 'get_id') else getattr(r, 'id', None),
                'cancha_id': getattr(r, 'cancha', None) and (r.cancha._id if hasattr(r.cancha, '_id') else getattr(r.cancha, 'id', None)) or getattr(r, 'cancha_id', None),
                'cancha_nombre': getattr(r, 'cancha_nombre', None),
                'cliente_dni': getattr(r, 'cliente', None) and (r.cliente.get_dni() if hasattr(r.cliente, 'get_dni') else getattr(r.cliente, 'dni', None)) or getattr(r, 'cliente_dni', None),
                'cliente_nombre': getattr(r, 'cliente_nombre', None),
                'precio': r.get_precio_final() if hasattr(r, 'get_precio_final') else getattr(r, '_precio_final', None) or getattr(r, 'precio', None),
                'fecha': fecha_iso,
                'horarios': horarios_out,
            }

        return jsonify(reserva_to_dict(r))
    except Exception as e:
        return jsonify({'error': 'Error al obtener reserva', 'detail': str(e)}), 500


@app.route('/reservas/<int:reserva_id>', methods=['PUT'])
def api_actualizar_reserva(reserva_id):
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'Body JSON requerido'}), 400
    try:
        repositorio.actualizar_reserva(reserva_id, payload)
        updated = repositorio.obtener_reserva(reserva_id)
        return jsonify({'reserva_id': reserva_id, 'status': 'updated', 'reserva': updated})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Error al actualizar reserva', 'detail': str(e)}), 500


@app.route('/reservas/<int:reserva_id>', methods=['DELETE'])
def api_eliminar_reserva(reserva_id):
    try:
        repositorio.cancelar_reserva(reserva_id)
        return jsonify({'reserva_id': reserva_id, 'status': 'deleted'})
    except Exception as e:
        return jsonify({'error': 'Error al eliminar reserva', 'detail': str(e)}), 500


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
