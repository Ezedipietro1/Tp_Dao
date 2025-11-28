from typing import List, Optional, Dict, Any
from datetime import datetime, date, time

from db.connection import fetchall, fetchone, execute
from backend.models.cancha import Cancha
from backend.models.reserva import Reserva
from backend.models.servicio import Servicio
from backend.models.cliente import Cliente
from backend.models.horario import Horario
from backend.models.tipo_cancha import TipoCancha
from .ClientesRepo import *


def _row_to_reserva(row: Dict[str, Any]) -> Reserva:
    fecha = None
    if row.get('fecha'):
        try:
            fecha = datetime.fromisoformat(row.get('fecha')).date()
        except Exception:
            fecha = None

    cliente_obj = None
    if row.get('cliente_dni') or row.get('cliente_nombre'):
        cliente_obj = Cliente(row.get('cliente_dni'), row.get('cliente_nombre'), '', None, row.get('cliente_telefono'))

    cancha_obj = None
    if row.get('cancha_id'):
        try:
            tipo_nombre = row.get('cancha_tipo')
        except Exception:
            tipo_nombre = None
        tipo_obj_for_cancha = TipoCancha(row.get('cancha_id') or 0, tipo_nombre or '', row.get('precio_final') or 0)
        cancha_obj = object.__new__(Cancha)
        try:
            cancha_obj._id = int(row.get('cancha_id'))
        except Exception:
            cancha_obj._id = row.get('cancha_id')
        cancha_obj._tipo = tipo_obj_for_cancha
        cancha_obj._servicios = []
        cancha_obj._precio = row.get('precio_final') or tipo_obj_for_cancha.get_precio()
        try:
            # derive a display name: prefer explicit cancha_nombre if provided, otherwise use tipo name + id
            if row.get('cancha_nombre'):
                cancha_obj.nombre = row.get('cancha_nombre')
            else:
                tipo_name = row.get('cancha_tipo') or tipo_nombre or ''
                if tipo_name:
                    cancha_obj.nombre = f"{tipo_name} #{getattr(cancha_obj, '_id', '')}"
                else:
                    cancha_obj.nombre = f"Cancha {getattr(cancha_obj, '_id', '')}"
        except Exception:
            pass

    r = Reserva(id=row.get('id'), cliente=cliente_obj, cancha=cancha_obj, horarios=[], fecha=fecha)
    try:
        if row.get('precio_final') is not None:
            r._precio_final = row.get('precio_final')
    except Exception:
        pass

    # payment summary (may be added by listar_reservas as `pago_total`)
    try:
        pago_total = row.get('pago_total') if row.get('pago_total') is not None else 0
        try:
            r.pago_total = float(pago_total)
        except Exception:
            r.pago_total = 0.0
    except Exception:
        r.pago_total = 0.0

    try:
        # determine estado_pago: 'pagado' if pago_total >= precio_final, otherwise 'pendiente'
        precio = getattr(r, '_precio_final', None) or row.get('precio_final') or 0
        try:
            precio_val = float(precio)
        except Exception:
            precio_val = 0.0
        r.estado_pago = 'pagado' if getattr(r, 'pago_total', 0) >= precio_val and precio_val > 0 else 'pendiente'
    except Exception:
        r.estado_pago = 'pendiente'

    try:
        # prefer cancha.nombre if available, otherwise derive from tipo_cancha
        try:
            if getattr(cancha_obj, 'nombre', None):
                r.cancha_nombre = cancha_obj.nombre
            else:
                if row.get('cancha_nombre'):
                    r.cancha_nombre = row.get('cancha_nombre')
                elif row.get('cancha_tipo'):
                    r.cancha_nombre = f"{row.get('cancha_tipo')} #{row.get('cancha_id')}"
                else:
                    r.cancha_nombre = f"Cancha {row.get('cancha_id')}"
        except Exception:
            r.cancha_nombre = row.get('cancha_nombre')
        r.fecha = row.get('fecha')
        try:
            hrs = fetchall("SELECT h.id, h.inicio, h.fin FROM horario h JOIN reserva_x_horario rx ON h.id = rx.horario_id WHERE rx.reserva_id = ? ORDER BY h.inicio", (row.get('id'),))
            horario_objs = []
            for h in hrs:
                try:
                    horario_objs.append(Horario(h.get('id'), h.get('inicio'), h.get('fin')))
                except Exception:
                    try:
                        horario_objs.append(Horario(h.get('id'), h.get('inicio'), h.get('fin')))
                    except Exception:
                        pass
            r.horarios = horario_objs
            r.horarios_label = [f"{h.get('inicio')}-{h.get('fin')}" for h in hrs]
        except Exception:
            r.horarios = []
            r.horarios_label = []
        if cliente_obj:
            r.cliente_nombre = cliente_obj.get_nombre()
            r.cliente_apellido = cliente_obj.get_apellido()
    except Exception:
        pass
    return r


def verificar_disponibilidad(cancha_id: int, inicio_iso: str, fin_iso: str) -> bool:
    """Legacy interval-based availability check.
    Current data model uses fecha + horarios so interval fields are not available.
    This function returns True as a conservative default to avoid blocking callers.
    """
    # TODO: implement interval overlap check if reserva stores inicio/fin datetimes.
    return True


def crear_reserva_por_dni(reserva: Dict[str, Any]) -> int:
    dni = reserva.get('cliente_dni')
    if not dni:
        raise ValueError('cliente_dni es requerido')
    c = get_cliente_por_dni(dni)
    if not c:
        crear_cliente({'dni': dni, 'nombre': reserva.get('cliente_nombre', 'Anonimo'), 'telefono': None})

    payload = {
        'cancha_id': reserva.get('cancha_id'),
        'cliente_dni': dni,
        'fecha': reserva.get('fecha'),
        'horario_ids': reserva.get('horario_ids') or ([reserva.get('horario_id')] if reserva.get('horario_id') else None),
        'precio': reserva.get('precio'),
        'torneo_id': reserva.get('torneo_id') if 'torneo_id' in reserva else None,
    }
    return crear_reserva(payload)


def verificar_disponibilidad_por_horario(cancha_id: int, fecha: str, horario_id: int) -> bool:
    q = """
    SELECT COUNT(1) AS cnt FROM reserva r
    JOIN reserva_x_horario rx ON r.id = rx.reserva_id
    WHERE r.cancha_id = ? AND r.fecha = ? AND rx.horario_id = ?
    """
    row = fetchone(q, (cancha_id, fecha, horario_id))
    return row and row.get('cnt', 0) == 0


def crear_reserva(reserva: Dict[str, Any]) -> int:
    cancha_id = reserva.get('cancha_id')
    cliente_dni = reserva.get('cliente_dni')
    fecha = reserva.get('fecha')
    horario_ids = reserva.get('horario_ids') or reserva.get('horario_id')
    precio = reserva.get('precio')
    torneo_id = reserva.get('torneo_id')

    if not cancha_id or not cliente_dni or not fecha or not horario_ids or not precio:
        raise ValueError('Faltan campos en la reserva. Se requieren: cancha_id, cliente_dni, fecha, horario_ids, precio')

    # validate fecha not in the past (allow today)
    try:
        fecha_dt = datetime.fromisoformat(fecha).date()
    except Exception:
        raise ValueError('Formato de fecha inválido. Use YYYY-MM-DD')
    if fecha_dt < date.today():
        raise ValueError('La fecha de la reserva debe ser igual o posterior a la fecha actual')

    if isinstance(horario_ids, int):
        horario_ids = [horario_ids]

    # if any selected horario is an evening slot (starts at or after 19:00 or ends after 19:00),
    # require that the cancha has an illumination service
    try:
        placeholders = ','.join('?' for _ in horario_ids)
        qh = f"SELECT id, inicio, fin FROM horario WHERE id IN ({placeholders})"
        hrs = fetchall(qh, tuple(horario_ids)) if horario_ids else []
        needs_illum = False
        for h in hrs:
            inicio = h.get('inicio') if isinstance(h, dict) else getattr(h, 'inicio', None)
            fin = h.get('fin') if isinstance(h, dict) else getattr(h, 'fin', None)
            try:
                parts = str(inicio).split(':')
                hh = int(parts[0]) if parts and parts[0].isdigit() else None
            except Exception:
                hh = None
            try:
                partsf = str(fin).split(':')
                ff = int(partsf[0]) if partsf and partsf[0].isdigit() else None
            except Exception:
                ff = None
            if (hh is not None and hh >= 19) or (ff is not None and ff > 19):
                needs_illum = True
                break
        if needs_illum:
            row = fetchone("SELECT COUNT(1) as cnt FROM cancha_x_servicio cx JOIN servicio s ON cx.servicio_id = s.id WHERE cx.cancha_id = ? AND LOWER(s.nombre) LIKE ?", (cancha_id, '%ilumin%'))
            if not row or row.get('cnt', 0) == 0:
                raise ValueError('La cancha seleccionada no dispone de iluminación nocturna necesaria para horarios posteriores a las 19:00')
    except ValueError:
        raise
    except Exception:
        # on error checking, be conservative and allow creation (avoid blocking due to check failure)
        pass

    for hid in horario_ids:
        if not verificar_disponibilidad_por_horario(cancha_id, fecha, hid):
            raise ValueError(f'Horario {hid} no disponible para la cancha {cancha_id} en la fecha {fecha}')

    q = "INSERT INTO reserva (cancha_id, cliente_dni, precio_final, fecha, torneo_id) VALUES (?, ?, ?, ?, ?)"
    reserva_id = execute(q, (cancha_id, cliente_dni, precio, fecha, torneo_id))

    for hid in horario_ids:
        execute("INSERT INTO reserva_x_horario (reserva_id, horario_id) VALUES (?, ?)", (reserva_id, hid))

    return reserva_id


def cancelar_reserva(reserva_id: int) -> None:
    # Prevent deleting a reserva that has pagos associated (FK in pago.reserva_id)
    row = fetchone("SELECT COUNT(1) as cnt FROM pago WHERE reserva_id = ?", (reserva_id,))
    if row and row.get('cnt', 0) > 0:
        raise ValueError(f"No se puede eliminar reserva {reserva_id}: existen pagos asociados")
    # Do not allow deleting reservations that already finished (historic)
    try:
        existing = obtener_reserva(reserva_id)
        if existing:
            # determine existing fecha
            try:
                existing_fecha = existing.get_fecha() if hasattr(existing, 'get_fecha') else getattr(existing, 'fecha', None)
                if isinstance(existing_fecha, str):
                    existing_fecha_dt = datetime.fromisoformat(existing_fecha).date()
                elif isinstance(existing_fecha, datetime):
                    existing_fecha_dt = existing_fecha.date()
                elif isinstance(existing_fecha, date):
                    existing_fecha_dt = existing_fecha
                else:
                    existing_fecha_dt = None
            except Exception:
                existing_fecha_dt = None

            now_date = date.today()
            if existing_fecha_dt is not None:
                if existing_fecha_dt < now_date:
                    raise ValueError('No se puede eliminar una reserva que ya finalizó (histórico)')
                if existing_fecha_dt == now_date:
                    # if today, check if all horarios already finished
                    try:
                        raw_hs = getattr(existing, 'horarios', []) or []
                        max_fin_min = None
                        earliest_start_min = None
                        for h in raw_hs:
                            inicio = None
                            fin = None
                            if isinstance(h, dict):
                                inicio = h.get('inicio')
                                fin = h.get('fin')
                            else:
                                inicio = getattr(h, 'inicio', None) or getattr(h, '_inicio', None)
                                fin = getattr(h, 'fin', None) or getattr(h, '_fin', None)
                            if inicio and fin:
                                parts_i = str(inicio).split(':')
                                parts_f = str(fin).split(':')
                                try:
                                    ih = int(parts_i[0])
                                    im = int(parts_i[1]) if len(parts_i) > 1 else 0
                                    fh = int(parts_f[0])
                                    fm = int(parts_f[1]) if len(parts_f) > 1 else 0
                                except Exception:
                                    continue
                                start_min = ih * 60 + im
                                end_min = fh * 60 + fm
                                if end_min <= start_min:
                                    end_min += 24 * 60
                                if earliest_start_min is None or start_min < earliest_start_min:
                                    earliest_start_min = start_min
                                if max_fin_min is None or end_min > max_fin_min:
                                    max_fin_min = end_min
                        if max_fin_min is not None:
                            now = datetime.now()
                            now_min = now.hour * 60 + now.minute
                            now_comp = now_min
                            if max_fin_min > 24 * 60 and earliest_start_min is not None and now_min < earliest_start_min:
                                now_comp = now_min + 24 * 60
                            if now_comp > max_fin_min:
                                raise ValueError('No se puede eliminar una reserva que ya finalizó (histórico)')
                    except ValueError:
                        raise
                    except Exception:
                        # if any parsing error, proceed with deletion (avoid blocking)
                        pass
    except ValueError:
        # re-raise user-facing errors
        raise
    except Exception:
        # ignore and proceed to deletion
        pass

    execute("DELETE FROM reserva_x_horario WHERE reserva_id = ?", (reserva_id,))
    execute("DELETE FROM reserva WHERE id = ?", (reserva_id,))


def obtener_reserva(reserva_id: int) -> Optional[Reserva]:
    q = ("SELECT r.*, ch.id AS cancha_id, tc.nombre AS cancha_tipo, "
         "cl.dni AS cliente_dni, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono "
         "FROM reserva r JOIN cancha ch ON r.cancha_id = ch.id LEFT JOIN tipo_cancha tc ON ch.tipo_cancha_id = tc.id JOIN cliente cl ON r.cliente_dni = cl.dni WHERE r.id = ?")
    row = fetchone(q, (reserva_id,))
    if not row:
        return None
    return _row_to_reserva(row)


def actualizar_reserva(reserva_id: int, reserva: Dict[str, Any]) -> int:
    # expected keys: cancha_id, cliente_dni, fecha, horario_ids (list), precio, torneo_id(optional)
    cancha_id = reserva.get('cancha_id')
    cliente_dni = reserva.get('cliente_dni')
    fecha = reserva.get('fecha')
    horario_ids = reserva.get('horario_ids') or reserva.get('horario_id')
    precio = reserva.get('precio')
    torneo_id = reserva.get('torneo_id') if 'torneo_id' in reserva else None

    if not cancha_id or not cliente_dni or not fecha or not horario_ids or not precio:
        raise ValueError('Faltan campos en la reserva. Se requieren: cancha_id, cliente_dni, fecha, horario_ids, precio')

    # don't allow modifying if the existing reservation is already finished
    try:
        existing = obtener_reserva(reserva_id)
        if existing:
            # obtain existing fecha as date
            try:
                existing_fecha = existing.get_fecha() if hasattr(existing, 'get_fecha') else getattr(existing, 'fecha', None)
                if isinstance(existing_fecha, str):
                    existing_fecha_dt = datetime.fromisoformat(existing_fecha).date()
                elif isinstance(existing_fecha, datetime):
                    existing_fecha_dt = existing_fecha.date()
                elif isinstance(existing_fecha, date):
                    existing_fecha_dt = existing_fecha
                else:
                    existing_fecha_dt = None
            except Exception:
                existing_fecha_dt = None

            now_date = date.today()
            if existing_fecha_dt is not None:
                if existing_fecha_dt < now_date:
                    raise ValueError('No se puede modificar una reserva que ya finalizó')
                if existing_fecha_dt == now_date:
                    # if today, check horario end times: if current time is past all horarios' end, consider finished
                    try:
                        raw_hs = getattr(existing, 'horarios', []) or []
                        max_fin_min = None
                        earliest_start_min = None
                        for h in raw_hs:
                            inicio = None
                            fin = None
                            if isinstance(h, dict):
                                inicio = h.get('inicio')
                                fin = h.get('fin')
                            else:
                                inicio = getattr(h, 'inicio', None) or getattr(h, '_inicio', None)
                                fin = getattr(h, 'fin', None) or getattr(h, '_fin', None)
                            if inicio and fin:
                                parts_i = str(inicio).split(':')
                                parts_f = str(fin).split(':')
                                try:
                                    ih = int(parts_i[0])
                                    im = int(parts_i[1]) if len(parts_i) > 1 else 0
                                    fh = int(parts_f[0])
                                    fm = int(parts_f[1]) if len(parts_f) > 1 else 0
                                except Exception:
                                    continue
                                start_min = ih * 60 + im
                                end_min = fh * 60 + fm
                                if end_min <= start_min:
                                    end_min += 24 * 60
                                if earliest_start_min is None or start_min < earliest_start_min:
                                    earliest_start_min = start_min
                                if max_fin_min is None or end_min > max_fin_min:
                                    max_fin_min = end_min
                        if max_fin_min is not None:
                            now = datetime.now()
                            now_min = now.hour * 60 + now.minute
                            now_comp = now_min
                            if max_fin_min > 24 * 60 and earliest_start_min is not None and now_min < earliest_start_min:
                                now_comp = now_min + 24 * 60
                            if now_comp > max_fin_min:
                                raise ValueError('No se puede modificar una reserva que ya finalizó')
                    except ValueError:
                        raise
                    except Exception:
                        # on any parsing issue, be conservative and allow modification
                        pass
    except ValueError:
        # re-raise explicit user errors
        raise
    except Exception:
        # ignore errors in checking and proceed (don't block update)
        pass

    if isinstance(horario_ids, int):
        horario_ids = [horario_ids]

    # verify availability excluding this reserva id
    for hid in horario_ids:
        q = "SELECT COUNT(1) AS cnt FROM reserva r JOIN reserva_x_horario rx ON r.id = rx.reserva_id WHERE r.cancha_id = ? AND r.fecha = ? AND rx.horario_id = ? AND r.id != ?"
        row = fetchone(q, (cancha_id, fecha, hid, reserva_id))
        if row and row.get('cnt', 0) > 0:
            raise ValueError(f'Horario {hid} no disponible para la cancha {cancha_id} en la fecha {fecha}')

    # same illumination requirement check as in crear_reserva
    try:
        placeholders = ','.join('?' for _ in horario_ids)
        qh = f"SELECT id, inicio, fin FROM horario WHERE id IN ({placeholders})"
        hrs = fetchall(qh, tuple(horario_ids)) if horario_ids else []
        needs_illum = False
        for h in hrs:
            inicio = h.get('inicio') if isinstance(h, dict) else getattr(h, 'inicio', None)
            fin = h.get('fin') if isinstance(h, dict) else getattr(h, 'fin', None)
            try:
                parts = str(inicio).split(':')
                hh = int(parts[0]) if parts and parts[0].isdigit() else None
            except Exception:
                hh = None
            try:
                partsf = str(fin).split(':')
                ff = int(partsf[0]) if partsf and partsf[0].isdigit() else None
            except Exception:
                ff = None
            if (hh is not None and hh >= 19) or (ff is not None and ff > 19):
                needs_illum = True
                break
        if needs_illum:
            row = fetchone("SELECT COUNT(1) as cnt FROM cancha_x_servicio cx JOIN servicio s ON cx.servicio_id = s.id WHERE cx.cancha_id = ? AND LOWER(s.nombre) LIKE ?", (cancha_id, '%ilumin%'))
            if not row or row.get('cnt', 0) == 0:
                raise ValueError('La cancha seleccionada no dispone de iluminación nocturna necesaria para horarios posteriores a las 19:00')
    except ValueError:
        raise
    except Exception:
        pass

    # update reserva row
    q = "UPDATE reserva SET cancha_id = ?, cliente_dni = ?, precio_final = ?, fecha = ?, torneo_id = ? WHERE id = ?"
    execute(q, (cancha_id, cliente_dni, precio, fecha, torneo_id, reserva_id))

    # update horario links
    execute("DELETE FROM reserva_x_horario WHERE reserva_id = ?", (reserva_id,))
    for hid in horario_ids:
        execute("INSERT INTO reserva_x_horario (reserva_id, horario_id) VALUES (?, ?)", (reserva_id, hid))

    return reserva_id


def listar_reservas(cancha_id: Optional[int] = None) -> List[Reserva]:
    # Note: avoid selecting cancha.current precio_final to preserve the reservation's stored precio_final
    base = ("SELECT r.*, ch.id AS cancha_id, tc.nombre AS cancha_tipo, "
            "cl.dni AS cliente_dni, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono "
            "FROM reserva r JOIN cancha ch ON r.cancha_id = ch.id LEFT JOIN tipo_cancha tc ON ch.tipo_cancha_id = tc.id JOIN cliente cl ON r.cliente_dni = cl.dni")
    if cancha_id:
        q = base + " WHERE r.cancha_id = ? ORDER BY r.fecha"
        rows = fetchall(q, (cancha_id,))
    else:
        q = base + " ORDER BY r.fecha"
        rows = fetchall(q)
    # augment each row with payment total for convenience
    out = []
    for r in rows:
        try:
            pid = r.get('id')
            pay = fetchone("SELECT SUM(monto) as total FROM pago WHERE reserva_id = ?", (pid,))
            total = pay.get('total') if pay and pay.get('total') is not None else 0
            r['pago_total'] = total
        except Exception:
            r['pago_total'] = 0
        out.append(_row_to_reserva(r))
    return out


def listar_horarios() -> List[Dict[str, Any]]:
    q = "SELECT id, inicio, fin FROM horario ORDER BY inicio"
    rows = fetchall(q)
    return rows


def calcular_ingresos(fecha_inicio_iso: str, fecha_fin_iso: str) -> float:
    q = "SELECT SUM(p.monto) AS total FROM pago p JOIN reserva r ON p.reserva_id = r.id WHERE p.fecha >= ? AND p.fecha <= ?"
    row = fetchone(q, (fecha_inicio_iso, fecha_fin_iso))
    return float(row['total']) if row and row['total'] is not None else 0.0


def registrar_pago(pago: Dict[str, Any]) -> int:
    # pago may optionally include 'estado_id'; default to 2 (Pagado) if not provided
    estado_id = pago.get('estado_id') if 'estado_id' in pago else 2
    q = "INSERT INTO pago (reserva_id, metodo_pago_id, monto, estado_id) VALUES (?, ?, ?, ?)"
    return execute(q, (pago['reserva_id'], pago['metodo_pago_id'], pago['monto'], estado_id))
