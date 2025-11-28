from flask import Blueprint, jsonify, request
from ..repository import repositorio

torneos_bp = Blueprint('torneos', __name__)


@torneos_bp.route('/torneos', methods=['GET'])
def api_list_torneos():
    try:
        data = repositorio.listar_torneos()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': 'Error al listar torneos', 'detail': str(e)}), 500


@torneos_bp.route('/torneos', methods=['POST'])
def api_crear_torneo():
    payload = request.get_json() or {}
    try:
        tid = repositorio.crear_torneo(payload)
        return jsonify({'torneo_id': tid}), 201
    except Exception as e:
        return jsonify({'error': 'Error al crear torneo', 'detail': str(e)}), 500


@torneos_bp.route('/torneos/<int:torneo_id>', methods=['GET'])
def api_get_torneo(torneo_id):
    try:
        t = repositorio.obtener_torneo(torneo_id)
        if not t:
            return jsonify({'error': 'Torneo no encontrado'}), 404
        return jsonify(t)
    except Exception as e:
        return jsonify({'error': 'Error al obtener torneo', 'detail': str(e)}), 500


@torneos_bp.route('/torneos/<int:torneo_id>', methods=['PUT'])
def api_update_torneo(torneo_id):
    payload = request.get_json() or {}
    try:
        repositorio.actualizar_torneo(torneo_id, payload)
        return jsonify({'torneo_id': torneo_id, 'status': 'updated'})
    except Exception as e:
        return jsonify({'error': 'Error al actualizar torneo', 'detail': str(e)}), 500


@torneos_bp.route('/torneos/<int:torneo_id>', methods=['DELETE'])
def api_delete_torneo(torneo_id):
    try:
        repositorio.eliminar_torneo(torneo_id)
        return jsonify({'torneo_id': torneo_id, 'status': 'deleted'})
    except Exception as e:
        return jsonify({'error': 'Error al eliminar torneo', 'detail': str(e)}), 500


@torneos_bp.route('/torneos/<int:torneo_id>/reservas-sync', methods=['POST'])
def api_sync_reservas_torneo(torneo_id):
    payload = request.get_json() or {}
    try:
        summary = repositorio.sincronizar_reservas(torneo_id, payload)
        return jsonify({'torneo_id': torneo_id, 'summary': summary})
    except Exception as e:
        return jsonify({'error': 'Error al sincronizar reservas', 'detail': str(e)}), 500
