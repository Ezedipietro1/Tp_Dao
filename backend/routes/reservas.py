from flask import Blueprint, jsonify, request
from ..repository import repositorio

reservas_bp = Blueprint('reservas', __name__)


@reservas_bp.route('/reservas', methods=['GET'])
def api_listar_reservas():
    try:
        cancha_id = request.args.get('cancha_id', type=int)
        cliente_dni = request.args.get('cliente_dni')
        reservas = repositorio.listar_reservas(cancha_id if cancha_id else None)
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


@reservas_bp.route('/reservas', methods=['POST'])
def api_crear_reserva():
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'Body JSON requerido'}), 400
    if 'cliente_dni' not in payload:
        return jsonify({'error': 'Se requiere cliente_dni'}), 400
    if 'cancha_id' not in payload or 'fecha' not in payload or ('horario_ids' not in payload and 'horario_id' not in payload) or 'precio' not in payload:
        return jsonify({'error': 'Faltan campos en el body. Se requieren: cancha_id, fecha, horario_ids (o horario_id), precio y cliente_dni'}), 400
    try:
        rid = repositorio.crear_reserva_por_dni(payload)
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Error interno al crear la reserva', 'detail': str(e)}), 500
    return jsonify({'reserva_id': rid}), 201


@reservas_bp.route('/reservas/<int:reserva_id>', methods=['GET'])
def api_get_reserva(reserva_id):
    try:
        r = repositorio.obtener_reserva(reserva_id)
        if not r:
            return jsonify({'error': 'Reserva no encontrada'}), 404

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


@reservas_bp.route('/reservas/<int:reserva_id>', methods=['PUT'])
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


@reservas_bp.route('/reservas/<int:reserva_id>', methods=['DELETE'])
def api_eliminar_reserva(reserva_id):
    try:
        repositorio.cancelar_reserva(reserva_id)
        return jsonify({'reserva_id': reserva_id, 'status': 'deleted'})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Error al eliminar reserva', 'detail': str(e)}), 500


@reservas_bp.route('/reservas/<int:reserva_id>/cancel', methods=['POST'])
def api_cancelar_reserva(reserva_id):
    repositorio.cancelar_reserva(reserva_id)
    return jsonify({'reserva_id': reserva_id, 'status': 'cancelada'})
