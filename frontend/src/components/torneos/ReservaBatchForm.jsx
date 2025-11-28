import React, { useState, useEffect } from 'react';
import { reservasService } from '../../services/reservas.service';
import { torneosService } from '../../services/torneos.service';
import modalDialogService from '../../services/modalDialog.service';

// Simple batch form: select date range, start time and duration, and create reservations for selected canchas
function ReservaBatchForm({ canchaIds = [], nombre = '', descripcion = '', clienteDni = '', onCancel = null, onSaved = null, onSave = null, viewOnly = false, fechaReservas = '', initialSelectedHorarios = [], initialFecha = '', isEditing = false }){
  // Removed start/end date, start time, duration and interval controls
  const [progress, setProgress] = useState(null);

  const [checkDate, setCheckDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedHorarios, setSelectedHorarios] = useState([]);
  const [reservedHorarios, setReservedHorarios] = useState([]);
  // Note: crearReservas (batch by start/end/interval) removed. Now creation uses the
  // selected common horarios and the single `checkDate` to build reservas.

  // load common available horarios for given date across selected canchas
  const loadCommonHorarios = async (fecha) => {
    if (!fecha || !canchaIds || canchaIds.length === 0) {
      setAvailableSlots([]);
      return;
    }
    try {
      const lists = await Promise.all(canchaIds.map(cid => reservasService.ListarHorariosDisponibles({ cancha_id: cid, fecha })));
      // each list: [{id, inicio, fin, label, disponible}]
      // build map of id -> count of disponible across canchas
      const count = {};
      const mapById = {};
      lists.forEach(lst => {
        (lst || []).forEach(it => {
          if (!it) return;
          const id = it.id;
          if (!(id in count)) count[id] = 0;
          if (it.disponible) count[id] += 1;
          mapById[id] = it;
        });
      });
      const commons = Object.keys(count).filter(k => count[k] === canchaIds.length).map(k => mapById[k]);
      // ensure each slot has a label
      const normalized = commons.map(s => ({ ...s, label: s.label || (s.inicio && s.fin ? `${s.inicio}-${s.fin}` : (s.id || '')) }));
      // merge any currently selected horarios so they appear as buttons even if not present in commons
      const mergedMap = {};
      (normalized || []).forEach(s => {
        const key = (s.id !== undefined && s.id !== null) ? String(s.id) : s.label;
        if (key) mergedMap[key] = s;
      });
      (selectedHorarios || []).forEach(sel => {
        try {
          const key = (sel.id !== undefined && sel.id !== null) ? String(sel.id) : sel.label;
          if (!key) return;
          if (!mergedMap[key]) {
            mergedMap[key] = { id: sel.id, inicio: sel.inicio, fin: sel.fin, label: sel.label || (sel.inicio && sel.fin ? `${sel.inicio}-${sel.fin}` : (sel.id !== undefined && sel.id !== null ? String(sel.id) : '')) };
          }
        } catch (e) { /* ignore */ }
      });
      const merged = Object.values(mergedMap).sort((a,b)=>String(a.inicio || a.label).localeCompare(String(b.inicio || b.label)));
      setAvailableSlots(merged);
    } catch (e) {
      console.error('Error cargando horarios comunes', e);
      setAvailableSlots([]);
    }
  };

  // When in viewOnly mode, load reservas for the provided fechaReservas and collect their horarios
  useEffect(() => {
    if (!viewOnly) return;
    const load = async () => {
      try {
        if (!fechaReservas) {
          setReservedHorarios([]);
          return;
        }
        const all = await reservasService.Buscar({});
        // filter by fecha and by cancha ids (if provided)
        const filtered = (all || []).filter(r => {
          try {
            const sameDate = (r.fecha || '').slice(0,10) === (fechaReservas || '').slice(0,10);
            if (!sameDate) return false;
            if (!canchaIds || canchaIds.length === 0) return true;
            return canchaIds.includes(r.cancha_id);
          } catch (e) { return false; }
        });
        // deduplicate by label (inicio-fin) to avoid showing the same time slot multiple times
        const mapByLabel = {};
        (filtered || []).forEach(r => {
          (r.horarios || []).forEach(h => {
            try {
              const label = (h && h.inicio && h.fin) ? `${h.inicio}-${h.fin}` : (h && (h.id || h.id === 0) ? String(h.id) : null);
              if (!label) return;
              if (mapByLabel[label]) return;
              mapByLabel[label] = { id: h.id || null, inicio: h.inicio, fin: h.fin, label };
            } catch (e) { /* ignore malformed horario */ }
          });
        });
        const hrs = Object.values(mapByLabel || {});
        setReservedHorarios(hrs.sort((a,b)=>String(a.inicio).localeCompare(String(b.inicio))));
      } catch (e) {
        console.error('Error cargando reservas del torneo', e);
        setReservedHorarios([]);
      }
    };
    load();
  }, [viewOnly, fechaReservas, canchaIds]);

  const toggleHorarioSeleccionado = (horario) => {
    if (!horario) return;
    const exists = (selectedHorarios || []).some(h => String(h.id) === String(horario.id));
    if (exists) {
      setSelectedHorarios(prev => prev.filter(h => String(h.id) !== String(horario.id)));
    } else {
      setSelectedHorarios(prev => [...prev, horario]);
    }
  };

  // initialize selected horarios and checkDate when editing an existing torneo
  useEffect(() => {
    if (viewOnly) return;
    if (initialFecha) setCheckDate(initialFecha);
    if (initialSelectedHorarios && initialSelectedHorarios.length > 0) {
      // map to expected objects, ensure label if possible
      const mapped = initialSelectedHorarios.map(h => {
        const id = (h && (h.id || h)) || null;
        const inicio = h && (h.inicio || h.start || null);
        const fin = h && (h.fin || h.end || null);
        const label = h && (h.label || (inicio && fin ? `${inicio}-${fin}` : null)) || (id !== null ? String(id) : '');
        return { id, inicio, fin, label };
      });
      // set selected
      setSelectedHorarios(mapped.sort((a,b)=>String(a.inicio || a.label).localeCompare(String(b.inicio || b.label))));
      // also merge these into availableSlots so they appear as buttons even if commons are not loaded yet
      setAvailableSlots(prev => {
        const byKey = {};
        (prev || []).forEach(p => { const key = p && (p.id !== undefined && p.id !== null ? String(p.id) : p.label); if (key) byKey[key] = p; });
        (mapped || []).forEach(m => { const key = m && (m.id !== undefined && m.id !== null ? String(m.id) : m.label); if (key && !byKey[key]) byKey[key] = m; });
        return Object.values(byKey).sort((a,b)=>String(a.inicio || a.label).localeCompare(String(b.inicio || b.label)));
      });
    }
  }, [viewOnly, initialSelectedHorarios, initialFecha]);

  // when availableSlots become available (e.g., after load), enrich selectedHorarios that only had id
  useEffect(() => {
    if (!availableSlots || availableSlots.length === 0) return;
    setSelectedHorarios(prev => {
      if (!prev || prev.length === 0) return prev;
      const byId = {};
      (availableSlots || []).forEach(s => { if (s && s.id !== undefined && s.id !== null) byId[String(s.id)] = s; });
      const enriched = prev.map(p => {
        const key = p && (p.id !== undefined && p.id !== null ? String(p.id) : null);
        if (key && byId[key]) {
          const s = byId[key];
          return { id: s.id, inicio: s.inicio, fin: s.fin, label: s.label || (s.inicio && s.fin ? `${s.inicio}-${s.fin}` : String(s.id)) };
        }
        // fallback: ensure label present
        return { id: p.id, inicio: p.inicio, fin: p.fin, label: p.label || (p.inicio && p.fin ? `${p.inicio}-${p.fin}` : (p.id !== undefined && p.id !== null ? String(p.id) : '')) };
      });
      return enriched.sort((a,b)=>String(a.inicio || a.label).localeCompare(String(b.inicio || b.label)));
    });
  }, [availableSlots]);

  const quitarHorario = (hid) => setSelectedHorarios(prev => prev.filter(h => String(h.id) !== String(hid)));

  const crearTorneoYReservas = async (nombre, descripcion, clienteDni) => {
    if (!nombre || !clienteDni) {
      modalDialogService.Alert('El torneo necesita nombre y DNI del cliente para crear reservas', 'Atención', 'Aceptar', '', null, null, 'warning');
      return;
    }
    if (!canchaIds || canchaIds.length === 0) { modalDialogService.Alert('Seleccione al menos una cancha', 'Atención', 'Aceptar', '', null, null, 'warning'); return; }
    if (!selectedHorarios || selectedHorarios.length === 0) { modalDialogService.Alert('Seleccione al menos un horario que esté disponible en todas las canchas', 'Atención', 'Aceptar', '', null, null, 'warning'); return; }
    if (!checkDate) { modalDialogService.Alert('Seleccione una fecha para comprobar horarios (y crear reservas)', 'Atención', 'Aceptar', '', null, null, 'warning'); return; }
    setProgress('Creando torneo...');
    try {
      // Use single checkDate as the date for all reservas (checkDate already in YYYY-MM-DD)
      const fecha = checkDate;
      const reservasPayload = [];
      for (let j=0;j<canchaIds.length;j++){
        const cancha_id = canchaIds[j];
        for (let k=0;k<selectedHorarios.length;k++){
          const hid = selectedHorarios[k].id;
          reservasPayload.push({ fecha, cancha_id, horario_ids: [hid] });
        }
      }
      const torResp = await torneosService.crear({ nombre, descripcion, fecha_inicio: fecha, fecha_fin: null, cliente_dni: clienteDni, canchas: canchaIds, reservas: reservasPayload });
      const torneo_id = torResp?.torneo_id ?? torResp?.id ?? null;
      if (!torneo_id) throw new Error('No se obtuvo id de torneo al crear');
      setProgress(`Torneo creado (id ${torneo_id}). Reservas programadas: ${reservasPayload.length}`);
      // show nicer modal like rest of app; on accept call onSaved to close parent form
      modalDialogService.Alert(
        `Torneo creado (id ${torneo_id}). Reservas programadas: ${reservasPayload.length}`,
        'Torneo creado',
        'Aceptar',
        '',
        () => { if (onSaved) onSaved(); },
        null,
        'success'
      );
    } catch (e) {
      console.error(e);
      setProgress('Error');
      modalDialogService.Alert('Error creando torneo y/o reservas: ' + (e?.message || JSON.stringify(e)), 'Error', 'Aceptar', '', null, null, 'danger');
    }
  };

  return (
    <>
      {!viewOnly && (
        <div className="row mb-2">
          <div className="col-sm-4 col-md-3 offset-md-1"></div>
          <div className="col-sm-8 col-md-6">
            <div className="subtitle">Programación de reservas</div>
          </div>
        </div>
      )}
      <div className="row">
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label">Fecha de reservas:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <div className="d-flex align-items-center gap-2">
                {!viewOnly ? (
                  <>
                    <input type="date" className="form-control" value={checkDate} onChange={e=>{ setCheckDate(e.target.value); }} />
                    <button type="button" className="btn btn-outline-secondary ms-2" onClick={()=>loadCommonHorarios(checkDate)}>Cargar horarios comunes</button>
                    {/* removed small side date badge to avoid duplicate display; date input is sufficient */}
                  </>
                ) : (
                  // viewOnly: show the torneo's reservation date (fechaReservas) if available
                  <div className="badge bg-light text-dark ms-2 p-2 fs-5">{
                    (() => {
                      try {
                        const src = fechaReservas || checkDate || '';
                        if (!src) return 'Sin fecha';
                        // parse YYYY-MM-DD into local Date to avoid timezone shifts
                        const parts = String(src).split('-');
                        let d;
                        if (parts.length === 3) {
                          const y = parseInt(parts[0],10);
                          const m = parseInt(parts[1],10) - 1;
                          const day = parseInt(parts[2],10);
                          d = new Date(y, m, day);
                        } else {
                          d = new Date(src);
                        }
                        if (!d || isNaN(d.getTime())) return src;
                        const dd = String(d.getDate()).padStart(2,'0');
                        const mm = String(d.getMonth()+1).padStart(2,'0');
                        const yyyy = d.getFullYear();
                        return `${dd}/${mm}/${yyyy}`;
                      } catch (_) { return fechaReservas || checkDate || '' }
                    })()
                  }</div>
                )}
              </div>
            </div>
          </div>

          {!viewOnly && (
            <div className="row mt-2">
              <div className="col-sm-4 col-md-3 offset-md-1">
                <label className="col-form-label">Horarios disponibles (comunes):</label>
              </div>
              <div className="col-sm-8 col-md-6">
                <div className="d-flex gap-2 flex-wrap align-items-center">
                  {(availableSlots || []).map(s => {
                    const isSel = (selectedHorarios || []).some(h => String(h.id) === String(s.id));
                    const cls = isSel ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
                    return (
                      <button key={s.id || s.label} type="button" className={cls} onClick={()=>toggleHorarioSeleccionado(s)}>{s.label}</button>
                    );
                  })}
                  {(!availableSlots || availableSlots.length===0) && <div className="text-muted">No hay horarios comunes cargados</div>}
                </div>
                <small className="form-text text-muted">Seleccione los horarios que deben reservarse en todas las canchas</small>
              </div>
            </div>
          )}

          {!viewOnly && (
            <div className="row mt-2">
              <div className="col-sm-4 col-md-3 offset-md-1">
                <label className="col-form-label">Horarios seleccionados:</label>
              </div>
              <div className="col-sm-8 col-md-6">
                <div className="d-flex gap-2 flex-wrap align-items-center">
                  {(selectedHorarios || []).map(h=> (
                    <div key={h.id} className="badge bg-info text-dark d-inline-flex align-items-center">
                      <span>{h.label}</span>
                      <button type="button" className="btn-close btn-close-white btn-sm ms-2" aria-label="Quitar" onClick={()=>quitarHorario(h.id)}></button>
                    </div>
                  ))}
                  {(!selectedHorarios || selectedHorarios.length===0) && <div className="text-muted">Ningún horario seleccionado</div>}
                </div>
                {/* Also render a summary list of selected horarios for clarity */}
                {(selectedHorarios || []).length > 0 && (
                  <div className="mt-2">
                    <strong>Horarios seleccionados:</strong>
                    <ul className="mb-0">
                      {(selectedHorarios || []).map(h => (
                        <li key={h.id}>{h.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* When viewing a torneo, show the horarios that were actually created for that torneo/date */}
          {viewOnly && (
            <div className="row mt-3">
              <div className="col-sm-4 col-md-3 offset-md-1">
                <label className="col-form-label">Horarios de las reservas:</label>
              </div>
              <div className="col-sm-8 col-md-6">
                <div>
                  {(!reservedHorarios || reservedHorarios.length === 0) && <div className="text-muted">No hay horarios reservados para esta fecha</div>}
                </div>
                {(reservedHorarios || []).length > 0 && (
                  <div className="mt-2">
                    <strong>Horarios reservados:</strong>
                    <ul className="mb-0">
                      {(reservedHorarios || []).map(h => (
                        <li key={h.id}>{h.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="row mt-3">
            <div className="col-sm-4 col-md-3 offset-md-1"></div>
              <div className="col-sm-8 col-md-6 text-center">
              {!viewOnly && !isEditing && (
                <button type="button" className="btn btn-success me-2" onClick={() => crearTorneoYReservas(nombre, descripcion, clienteDni)}>Crear torneo y reservas</button>
              )}
              {!viewOnly && isEditing && (
                <button type="button" className="btn btn-primary me-2" onClick={() => {
                  const payload = {
                    fecha: checkDate,
                    cancha_ids: canchaIds,
                    horario_ids: (selectedHorarios || []).map(h => h.id).filter(x=>x!==undefined && x!==null),
                    cliente_dni: clienteDni
                  };
                  // prefer a parent-provided onSave handler to perform the update. Pass payload so parent can sync reservas.
                  if (onSave) {
                    try { onSave(payload); } catch (e) { console.error('Error al ejecutar onSave', e); }
                  } else if (onSaved) {
                    // fallback: call onSaved to notify parent
                    try { onSaved(); } catch (e) { console.error('Error al ejecutar onSaved fallback', e); }
                  } else {
                    modalDialogService.Alert('Acción de guardar no disponible', 'Atención', 'Aceptar');
                  }
                }}>Guardar cambios</button>
              )}
              <button type="button" className="btn btn-warning ms-2" onClick={() => {
                  // Prefer parent handler if provided; otherwise clear local state
                  if (onCancel) { onCancel(); return; }
                  setProgress(null);
                  setAvailableSlots([]);
                  setSelectedHorarios([]);
                  setCheckDate('');
                }}>
                <i className="fa fa-undo"></i> Cancelar
              </button>
            </div>
          </div>

          {progress && (
            <div className="row mt-2">
              <div className="col-sm-4 col-md-3 offset-md-1"></div>
              <div className="col-sm-8 col-md-6 text-muted">{progress}</div>
            </div>
          )}
      </div>
    </>
  );
}

export default ReservaBatchForm;
