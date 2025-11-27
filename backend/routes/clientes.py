from flask import Blueprint, jsonify, request
import re
from ..repository import repositorio

clientes_bp = Blueprint('clientes', __name__)


@clientes_bp.route('/clientes', methods=['GET'])
def api_listar_clientes():
    try:
        nombre = request.args.get('nombre')
        cs = repositorio.listar_clientes(nombre=nombre) if nombre else repositorio.listar_clientes()
        return jsonify(cs)
    except Exception as e:
        return jsonify({'error': 'Error al obtener clientes', 'detail': str(e)}), 500


@clientes_bp.route('/clientes', methods=['POST'])
def api_crear_cliente():
    payload = request.get_json()
    if not payload or 'dni' not in payload or 'nombre' not in payload:
        return jsonify({'error': 'Body JSON requerido con campos: dni, nombre'}), 400
    dni_val = str(payload.get('dni'))
    nombre_val = str(payload.get('nombre'))
    telefono_val = payload.get('telefono')
    if not dni_val.isdigit() or len(dni_val) not in (7, 8):
        return jsonify({'error': 'DNI inválido. Debe ser un número de 7 u 8 dígitos.'}), 400
    if not re.match(r"^[A-Za-zÀ-ÿ\s]+$", nombre_val):
        return jsonify({'error': 'Nombre inválido. Solo se permiten letras y espacios.'}), 400
    if telefono_val is not None and str(telefono_val).strip() != '':
        t = str(telefono_val).strip()
        if not t.isdigit() or len(t) != 10:
            return jsonify({'error': 'Teléfono inválido. Debe contener exactamente 10 dígitos.'}), 400
    try:
        repositorio.crear_cliente(payload)
        return jsonify({'dni': payload.get('dni')}), 201
    except Exception as e:
        return jsonify({'error': 'Error al crear cliente', 'detail': str(e)}), 500


@clientes_bp.route('/clientes/<int:dni>', methods=['GET'])
def api_get_cliente(dni):
    try:
        c = repositorio.get_cliente_por_dni(dni)
        if not c:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        return jsonify(c)
    except Exception as e:
        return jsonify({'error': 'Error al obtener cliente', 'detail': str(e)}), 500


@clientes_bp.route('/clientes/<int:dni>', methods=['PUT'])
def api_actualizar_cliente(dni):
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'Body JSON requerido'}), 400
    if 'dni' in payload and str(payload.get('dni')) != str(dni):
        return jsonify({'error': 'No está permitido cambiar el DNI de un cliente'}), 400
    if 'nombre' in payload:
        nombre_val = str(payload.get('nombre') or '')
        if not re.match(r"^[A-Za-zÀ-ÿ\s]+$", nombre_val):
            return jsonify({'error': 'Nombre inválido. Solo se permiten letras y espacios.'}), 400
    if 'telefono' in payload:
        telefono_val = payload.get('telefono')
        if telefono_val is not None and str(telefono_val).strip() != '':
            t = str(telefono_val).strip()
            if not t.isdigit() or len(t) != 10:
                return jsonify({'error': 'Teléfono inválido. Debe contener exactamente 10 dígitos.'}), 400
    try:
        repositorio.actualizar_cliente(dni, payload)
        c = repositorio.get_cliente_por_dni(dni)
        return jsonify({'dni': dni, 'status': 'updated', 'cliente': c})
    except Exception as e:
        return jsonify({'error': 'Error al actualizar cliente', 'detail': str(e)}), 500


@clientes_bp.route('/clientes/<int:dni>', methods=['DELETE'])
def api_eliminar_cliente(dni):
    try:
        repositorio.eliminar_cliente(dni)
        return jsonify({'dni': dni, 'status': 'deleted'})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': 'Error al eliminar cliente', 'detail': str(e)}), 500
