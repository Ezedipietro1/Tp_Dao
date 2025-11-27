from flask import Blueprint, jsonify, request
from ..repository import repositorio

pagos_bp = Blueprint('pagos', __name__)


@pagos_bp.route('/pagos', methods=['POST'])
def api_registrar_pago():
    payload = request.get_json()
    required = ['reserva_id', 'metodo_pago_id', 'monto']
    if not payload or not all(k in payload for k in required):
        return jsonify({'error': 'Faltan campos en el body. Se requieren: ' + ','.join(required)}), 400
    pid = repositorio.registrar_pago(payload)
    return jsonify({'pago_id': pid}), 201
