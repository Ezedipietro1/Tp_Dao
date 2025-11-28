from flask import Blueprint, jsonify, request, current_app
from ..repository import repositorio
from flask import send_file
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

pagos_bp = Blueprint('pagos', __name__)


@pagos_bp.route('/pagos', methods=['POST'])
def api_registrar_pago():
    payload = request.get_json()
    required = ['reserva_id', 'metodo_pago_id', 'monto']
    if not payload or not all(k in payload for k in required):
        return jsonify({'error': 'Faltan campos en el body. Se requieren: ' + ','.join(required)}), 400
    try:
        # log payload for debugging using current_app
        try:
            current_app.logger.info(f"Registrar pago payload: {payload}")
        except Exception:
            pass

        # basic validation / coercion
        try:
            pid = repositorio.registrar_pago(payload)
        except Exception as ex:
            try:
                current_app.logger.exception('Error registrando pago')
            except Exception:
                pass
            raise

        return jsonify({'pago_id': pid}), 201
    except Exception as e:
        # return structured error
        return jsonify({'error': 'Error interno registrando pago', 'detail': str(e)}), 500




@pagos_bp.route('/pagos/<int:pago_id>/recibo', methods=['GET'])
def api_recibo_pago(pago_id: int):
    """Genera un recibo PDF para un pago dado y lo devuelve como attachment."""
    try:
        # consultar pago y reserva
        q = "SELECT p.id as pago_id, p.monto, p.fecha as pago_fecha, p.metodo_pago_id, p.estado_id, r.id as reserva_id, r.cancha_id, r.cliente_dni, r.precio_final, r.fecha as reserva_fecha FROM pago p JOIN reserva r ON p.reserva_id = r.id WHERE p.id = ?"
        row = repositorio.fetchone(q, (pago_id,)) if hasattr(repositorio, 'fetchone') else None
        # note: repositorio facade doesn't expose fetchone; use direct DB access via connection helper
        if not row:
            # fallback: query via connection module
            from ..db.connection import fetchone as db_fetchone
            row = db_fetchone(q, (pago_id,))

        if not row:
            return jsonify({'error': 'Pago no encontrado'}), 404

        # build PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        elements.append(Paragraph('Recibo de pago', styles['Title']))
        elements.append(Spacer(1, 0.2 * inch))
        elements.append(Paragraph(f"Pago ID: {row.get('pago_id')}", styles['Normal']))
        elements.append(Paragraph(f"Reserva ID: {row.get('reserva_id')}", styles['Normal']))
        elements.append(Paragraph(f"Cancha ID: {row.get('cancha_id')}", styles['Normal']))
        elements.append(Paragraph(f"Cliente DNI: {row.get('cliente_dni')}", styles['Normal']))
        elements.append(Paragraph(f"Fecha reserva: {row.get('reserva_fecha')}", styles['Normal']))
        elements.append(Paragraph(f"Fecha pago: {row.get('pago_fecha')}", styles['Normal']))
        elements.append(Paragraph(f"Método pago (id): {row.get('metodo_pago_id')}", styles['Normal']))
        elements.append(Paragraph(f"Monto: ${row.get('monto')}", styles['Normal']))
        elements.append(Spacer(1, 0.2 * inch))
        doc.build(elements)
        buffer.seek(0)
        filename = f"recibo_pago_{pago_id}.pdf"
        return send_file(buffer, as_attachment=True, download_name=filename, mimetype='application/pdf')
    except Exception as e:
        try:
            current_app.logger.exception('Error generando recibo')
        except Exception:
            pass
        return jsonify({'error': 'Error interno generando recibo', 'detail': str(e)}), 500
