from flask import Flask, jsonify, request
from TP_Canchas import repositorio

app = Flask(__name__)


@app.route('/canchas', methods=['GET'])
def api_listar_canchas():
    data = repositorio.listar_canchas()
    return jsonify(data)


@app.route('/canchas/<int:cancha_id>/disponibilidad', methods=['GET'])
def api_disponibilidad(cancha_id):
    inicio = request.args.get('inicio')
    fin = request.args.get('fin')
    if not inicio or not fin:
        return jsonify({'error': 'Debe pasar parametros inicio y fin en formato ISO'}), 400
    ok = repositorio.verificar_disponibilidad(cancha_id, inicio, fin)
    return jsonify({'cancha_id': cancha_id, 'disponible': ok})


@app.route('/reservas', methods=['POST'])
def api_crear_reserva():
    payload = request.get_json()
    required = ['cancha_id', 'cliente_id', 'inicio', 'fin', 'precio']
    if not payload or not all(k in payload for k in required):
        return jsonify({'error': 'Faltan campos en el body. Se requieren: ' + ','.join(required)}), 400
    # verificar disponibilidad
    if not repositorio.verificar_disponibilidad(payload['cancha_id'], payload['inicio'], payload['fin']):
        return jsonify({'error': 'Cancha no disponible en el periodo solicitado'}), 409
    rid = repositorio.crear_reserva(payload)
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
