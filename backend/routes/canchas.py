from flask import Blueprint, jsonify, request
import re
from ..repository import repositorio

canchas_bp = Blueprint('canchas', __name__)


@canchas_bp.route('/canchas', methods=['GET'])
def api_listar_canchas():
    try:
        tipo_cancha_id = request.args.get('tipo_cancha_id', type=int)
        min_precio = request.args.get('min_precio', type=float)
        max_precio = request.args.get('max_precio', type=float)
        if tipo_cancha_id is not None or min_precio is not None or max_precio is not None:
            filters = {'tipo_cancha_id': tipo_cancha_id, 'min_precio': min_precio, 'max_precio': max_precio}
            data = repositorio.buscar_canchas(filters)
        else:
            data = repositorio.listar_canchas()

        def cancha_to_dict(c):
            try:
                if isinstance(c, dict):
                    try:
                        cid = c.get('id')
                        c['has_reservas'] = bool(repositorio.contar_reservas(cid)) if cid is not None else False
                    except Exception:
                        pass
                    return c
                return {
                    'id': c.get_id() if hasattr(c, 'get_id') else getattr(c, 'id', None),
                    'nombre': getattr(c, 'nombre', None),
                    'precio_por_hora': c.get_precio() if hasattr(c, 'get_precio') else getattr(c, 'precio_por_hora', None),
                    'tipo_cancha_id': c.get_tipo_id() if hasattr(c, 'get_tipo_id') else getattr(c, 'tipo_cancha_id', None),
                    'estado_id': c.get_estado_id() if hasattr(c, 'get_estado_id') else getattr(c, 'estado_id', None),
                    'has_reservas': bool(repositorio.contar_reservas(c.get_id() if hasattr(c, 'get_id') else getattr(c, 'id', None)))
                }
            except Exception:
                return {}

        return jsonify([cancha_to_dict(c) for c in data])
    except Exception as e:
        return jsonify({'error': 'Error al listar canchas', 'detail': str(e)}), 500


@canchas_bp.route('/canchas', methods=['POST'])
def api_crear_cancha():
    payload = request.get_json()
    if not payload or 'tipo_cancha_id' not in payload:
        return jsonify({'error': 'Body JSON requerido con tipo_cancha_id'}), 400
    if 'id' in payload:
        return jsonify({'error': 'No enviar campo "id" al crear una cancha; será autogenerado'}), 400
    try:
        cid = repositorio.crear_cancha(payload)
        return jsonify({'cancha_id': cid}), 201
    except Exception as e:
        return jsonify({'error': 'Error al crear cancha', 'detail': str(e)}), 500


@canchas_bp.route('/canchas/<int:cancha_id>', methods=['PUT'])
def api_actualizar_cancha(cancha_id):
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'Body JSON requerido'}), 400
    try:
        repositorio.actualizar_cancha(cancha_id, payload)
        return jsonify({'cancha_id': cancha_id, 'status': 'updated'})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Error al actualizar cancha', 'detail': str(e)}), 500


@canchas_bp.route('/canchas/<int:cancha_id>', methods=['DELETE'])
def api_eliminar_cancha(cancha_id):
    try:
        repositorio.eliminar_cancha(cancha_id)
        return jsonify({'cancha_id': cancha_id, 'status': 'deleted'})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Error al eliminar cancha', 'detail': str(e)}), 500


@canchas_bp.route('/canchas/<int:cancha_id>/disponibilidad', methods=['GET'])
def api_disponibilidad(cancha_id):
    inicio = request.args.get('inicio')
    fin = request.args.get('fin')
    if not inicio or not fin:
        return jsonify({'error': 'Debe pasar parametros inicio y fin en formato ISO'}), 400
    ok = repositorio.verificar_disponibilidad(cancha_id, inicio, fin)
    return jsonify({'cancha_id': cancha_id, 'disponible': ok})


@canchas_bp.route('/canchas/<int:cancha_id>', methods=['GET'])
def api_get_cancha(cancha_id):
    try:
        c = repositorio.obtener_cancha(cancha_id)
        if not c:
            return jsonify({'error': 'Cancha no encontrada'}), 404
        return jsonify(c)
    except Exception as e:
        return jsonify({'error': 'Error al obtener cancha', 'detail': str(e)}), 500
