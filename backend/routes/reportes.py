from flask import Blueprint, jsonify, request, make_response
import tempfile, os
from ..repository import repositorio

reportes_bp = Blueprint('reportes', __name__)


@reportes_bp.route('/reportes/reservas/cliente/<int:dni>', methods=['GET'])
def api_reporte_reservas_por_cliente(dni: int):
    download = request.args.get('download', '0') == '1'
    try:
        from db.connection import DEFAULT_DB
        from backend.repository import reportes as rep_mod
        reporte_reservas_por_cliente = rep_mod.reporte_reservas_por_cliente
    except Exception as e:
        return jsonify({'error': 'Módulo de reportes no disponible', 'detail': str(e)}), 500

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    tmp.close()
    try:
        reporte_reservas_por_cliente(DEFAULT_DB, dni, tmp.name)
        with open(tmp.name, 'rb') as f:
            data = f.read()
        resp = make_response(data)
        resp.headers['Content-Type'] = 'application/pdf'
        filename = f'reporte_reservas_cliente_{dni}.pdf'
        if download:
            resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            resp.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        return resp
    finally:
        try:
            os.remove(tmp.name)
        except Exception:
            pass


@reportes_bp.route('/reportes/reservas/cancha/<int:cancha_id>', methods=['GET'])
def api_reporte_reservas_por_cancha(cancha_id: int):
    fecha_desde = request.args.get('desde')
    fecha_hasta = request.args.get('hasta')
    if not fecha_desde or not fecha_hasta:
        return jsonify({'error': 'Parámetros required: desde, hasta (YYYY-MM-DD)'}), 400
    download = request.args.get('download', '0') == '1'
    try:
        from db.connection import DEFAULT_DB
        from backend.repository import reportes as rep_mod
        reporte_reservas_por_cancha_en_periodo = rep_mod.reporte_reservas_por_cancha_en_periodo
    except Exception as e:
        return jsonify({'error': 'Módulo de reportes no disponible', 'detail': str(e)}), 500

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    tmp.close()
    try:
        reporte_reservas_por_cancha_en_periodo(DEFAULT_DB, cancha_id, fecha_desde, fecha_hasta, tmp.name)
        with open(tmp.name, 'rb') as f:
            data = f.read()
        resp = make_response(data)
        resp.headers['Content-Type'] = 'application/pdf'
        filename = f'reporte_reservas_cancha_{cancha_id}.pdf'
        if download:
            resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            resp.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        return resp
    finally:
        try:
            os.remove(tmp.name)
        except Exception:
            pass


@reportes_bp.route('/reportes/canchas/mas-utilizadas', methods=['GET'])
def api_reporte_canchas_mas_utilizadas():
    try:
        limite = int(request.args.get('limite', 10))
    except Exception:
        limite = 10
    download = request.args.get('download', '0') == '1'
    try:
        from db.connection import DEFAULT_DB
        from backend.repository import reportes as rep_mod
        reporte_canchas_mas_utilizadas = rep_mod.reporte_canchas_mas_utilizadas
    except Exception as e:
        return jsonify({'error': 'Módulo de reportes no disponible', 'detail': str(e)}), 500

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    tmp.close()
    try:
        reporte_canchas_mas_utilizadas(DEFAULT_DB, tmp.name, limite=limite)
        with open(tmp.name, 'rb') as f:
            data = f.read()
        resp = make_response(data)
        resp.headers['Content-Type'] = 'application/pdf'
        filename = f'reporte_canchas_mas_utilizadas.pdf'
        if download:
            resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            resp.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        return resp
    finally:
        try:
            os.remove(tmp.name)
        except Exception:
            pass


@reportes_bp.route('/reportes/reservas/por-canchas', methods=['GET'])
def api_reporte_reservas_por_canchas_periodo():
    fecha_desde = request.args.get('desde')
    fecha_hasta = request.args.get('hasta')
    if not fecha_desde or not fecha_hasta:
        return jsonify({'error': 'Parámetros required: desde, hasta (YYYY-MM-DD)'}), 400
    download = request.args.get('download', '0') == '1'
    try:
        from db.connection import DEFAULT_DB
        from backend.repository import reportes as rep_mod
        reporte_reservas_por_canchas_en_periodo = rep_mod.reporte_reservas_por_canchas_en_periodo
    except Exception as e:
        return jsonify({'error': 'Módulo de reportes no disponible', 'detail': str(e)}), 500

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    tmp.close()
    try:
        reporte_reservas_por_canchas_en_periodo(DEFAULT_DB, fecha_desde, fecha_hasta, tmp.name)
        with open(tmp.name, 'rb') as f:
            data = f.read()
        resp = make_response(data)
        resp.headers['Content-Type'] = 'application/pdf'
        filename = f'reporte_reservas_canchas_{fecha_desde}_{fecha_hasta}.pdf'
        if download:
            resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            resp.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        return resp
    finally:
        try:
            os.remove(tmp.name)
        except Exception:
            pass


@reportes_bp.route('/reportes/json/reservas/por-canchas', methods=['GET'])
def api_reporte_reservas_por_canchas_periodo_json():
    fecha_desde = request.args.get('desde')
    fecha_hasta = request.args.get('hasta')
    if not fecha_desde or not fecha_hasta:
        return jsonify({'error': 'Parámetros required: desde, hasta (YYYY-MM-DD)'}), 400
    include_details = request.args.get('include_details', '0') == '1'
    try:
        from db.connection import get_connection, DEFAULT_DB
    except Exception as e:
        return jsonify({'error': 'DB connection error', 'detail': str(e)}), 500

    try:
        conn = get_connection(DEFAULT_DB)
        cur = conn.cursor()
        cur.execute(
            "SELECT ca.id AS cancha_id, tc.nombre AS tipo_nombre, COUNT(r.id) AS reservas_count "
            "FROM cancha ca LEFT JOIN tipo_cancha tc ON ca.tipo_cancha_id = tc.id "
            "LEFT JOIN reserva r ON r.cancha_id = ca.id AND r.fecha BETWEEN ? AND ? "
            "GROUP BY ca.id ORDER BY reservas_count DESC",
            (fecha_desde, fecha_hasta),
        )
        filas = cur.fetchall()
        out = []
        for f in filas:
            item = {'cancha_id': f['cancha_id'], 'tipo_nombre': f['tipo_nombre'] or None, 'reservas_count': int(f['reservas_count'])}
            if include_details and item['reservas_count'] > 0:
                cur.execute(
                    "SELECT r.id, r.fecha, r.cliente_dni, r.precio_final FROM reserva r WHERE r.cancha_id = ? AND r.fecha BETWEEN ? AND ? ORDER BY r.fecha",
                    (item['cancha_id'], fecha_desde, fecha_hasta)
                )
                reservas = []
                for rr in cur.fetchall():
                    cur.execute(
                        "SELECT h.inicio AS inicio, h.fin AS fin FROM horario h JOIN reserva_x_horario rx ON h.id = rx.horario_id WHERE rx.reserva_id = ? ORDER BY h.inicio",
                        (rr['id'],)
                    )
                    horarios = cur.fetchall()
                    horarios_list = [{'inicio': h['inicio'], 'fin': h['fin']} for h in horarios]
                    reservas.append({'id': rr['id'], 'fecha': rr['fecha'], 'cliente_dni': rr['cliente_dni'], 'precio': rr['precio_final'], 'horarios': horarios_list})
                item['reservas'] = reservas
            out.append(item)
        return jsonify(out)
    except Exception as e:
        return jsonify({'error': 'Error generando reporte JSON', 'detail': str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@reportes_bp.route('/reportes/json/canchas/mas-utilizadas', methods=['GET'])
def api_reporte_canchas_mas_utilizadas_json():
    try:
        limite = int(request.args.get('limite', 10))
    except Exception:
        limite = 10
    try:
        from db.connection import get_connection, DEFAULT_DB
        conn = get_connection(DEFAULT_DB)
        cur = conn.cursor()
        cur.execute(
            "SELECT ca.id AS cancha_id, tc.nombre AS tipo_nombre, COUNT(r.id) AS reservas_count "
            "FROM cancha ca LEFT JOIN tipo_cancha tc ON ca.tipo_cancha_id = tc.id "
            "LEFT JOIN reserva r ON r.cancha_id = ca.id "
            "GROUP BY ca.id ORDER BY reservas_count DESC LIMIT ?",
            (limite,)
        )
        filas = cur.fetchall()
        out = [{'cancha_id': f['cancha_id'], 'tipo_nombre': f['tipo_nombre'] or None, 'reservas_count': int(f['reservas_count'])} for f in filas]
        return jsonify(out)
    except Exception as e:
        return jsonify({'error': 'Error generando reporte JSON', 'detail': str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@reportes_bp.route('/reportes/json/utilizacion/<int:anio>', methods=['GET'])
def api_reporte_utilizacion_mensual_json(anio: int):
    try:
        from db.connection import get_connection, DEFAULT_DB
        conn = get_connection(DEFAULT_DB)
        cur = conn.cursor()
        cur.execute(
            "SELECT substr(fecha,1,4) as anio, substr(fecha,6,2) as mes, COUNT(*) as cnt "
            "FROM reserva WHERE substr(fecha,1,4) = ? GROUP BY mes ORDER BY mes",
            (str(anio),)
        )
        rows = cur.fetchall()
        counts = [0] * 12
        for r in rows:
            try:
                m = int(r['mes'])
                if 1 <= m <= 12:
                    counts[m-1] = int(r['cnt'])
            except Exception:
                continue
        return jsonify({'anio': anio, 'counts': counts})
    except Exception as e:
        return jsonify({'error': 'Error generando reporte JSON', 'detail': str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


@reportes_bp.route('/reportes/utilizacion/<int:anio>', methods=['GET'])
def api_reporte_utilizacion_mensual(anio: int):
    download = request.args.get('download', '0') == '1'
    try:
        from db.connection import DEFAULT_DB
        from backend.repository import reportes as rep_mod
        reporte_utilizacion_mensual = rep_mod.reporte_utilizacion_mensual
    except Exception as e:
        return jsonify({'error': 'Módulo de reportes no disponible', 'detail': str(e)}), 500

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    tmp.close()
    try:
        reporte_utilizacion_mensual(DEFAULT_DB, anio, tmp.name)
        with open(tmp.name, 'rb') as f:
            data = f.read()
        resp = make_response(data)
        resp.headers['Content-Type'] = 'application/pdf'
        filename = f'reporte_utilizacion_{anio}.pdf'
        if download:
            resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            resp.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        return resp
    finally:
        try:
            os.remove(tmp.name)
        except Exception:
            pass
