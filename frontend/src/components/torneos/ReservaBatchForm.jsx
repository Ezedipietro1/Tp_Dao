import React, { useState } from 'react';
import { reservasService } from '../../services/reservas.service';
import { torneosService } from '../../services/torneos.service';
import { canchasService } from '../../services/canchas.service';

// Simple batch form: select date range, start time and duration, and create reservations for selected canchas
function ReservaBatchForm({ canchaIds = [], nombre = '', descripcion = '', clienteDni = '', onCancel = null }){
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [durationHours, setDurationHours] = useState(2);
  const [intervalDays, setIntervalDays] = useState(1);
  const [progress, setProgress] = useState(null);

  const buildDates = () => {
    if (!startDate) return [];
    const from = new Date(startDate);
    const to = endDate ? new Date(endDate) : new Date(startDate);
    const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate()+intervalDays)){
      days.push(new Date(d));
    }
    return days;
  };

  const [checkDate, setCheckDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedHorarios, setSelectedHorarios] = useState([]);

  const crearReservas = async () => {
    const dates = buildDates();
    if (dates.length === 0 || canchaIds.length === 0) {
      alert('Seleccione al menos una cancha y un rango de fechas válido');
      return;
    }
    setProgress('Creando...');
    try {
      // For each date and cancha create a reserva payload.
      for (let i=0;i<dates.length;i++){
        const d = dates[i];
        const fecha = d.toISOString().slice(0,10);
        for (let j=0;j<canchaIds.length;j++){
          const cancha_id = canchaIds[j];
          const inicio = startTime;
          // calculate fin time
          const [h,m] = inicio.split(':').map(x=>parseInt(x,10)||0);
          const finHour = h + Number(durationHours);
          const fin = `${String(finHour).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

          // build minimal reserva structure expected by backend
          const payload = {
            cancha_id,
            fecha,
            horarios: [{ inicio, fin }],
            cliente_id: null,
            precio_final: null,
            observaciones: 'Reserva creada por torneo (batch)'
          };
          try {
            const canchaDetail = await canchasService.BuscarPorId({ id: cancha_id }).catch(()=>null);
            const precio = canchaDetail?.precio_final ?? canchaDetail?.tipo_precio ?? 0;
            // backend expects precio and cliente_dni; here cliente must be provided in payload externally
            await reservasService.Grabar({ cancha_id, fecha, horario_ids: [payload.horarios[0].id || payload.horarios[0].inicio], cliente_dni: payload.cliente_dni, precio, torneo_id: payload.torneo_id }).catch(e=>{ throw e; });
          } catch (e) {
            console.error('Error creando reserva', e);
          }
        }
      }
      setProgress('Completado');
      alert('Reservas creadas (revisar el backend para conflictos).');
    } catch (e) {
      console.error(e);
      setProgress('Error');
    }
  };

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
      setAvailableSlots(commons.sort((a,b)=>String(a.inicio).localeCompare(String(b.inicio))));
    } catch (e) {
      console.error('Error cargando horarios comunes', e);
      setAvailableSlots([]);
    }
  };

  const agregarHorarioSeleccionado = (horario) => {
    if (!horario) return;
    if ((selectedHorarios || []).some(h => String(h.id) === String(horario.id))) return;
    setSelectedHorarios(prev => [...prev, horario]);
  };

  const quitarHorario = (hid) => setSelectedHorarios(prev => prev.filter(h => String(h.id) !== String(hid)));

  const crearTorneoYReservas = async (nombre, descripcion, clienteDni) => {
    if (!nombre || !clienteDni) {
      alert('El torneo necesita nombre y DNI del cliente para crear reservas');
      return;
    }
    if (!canchaIds || canchaIds.length === 0) { alert('Seleccione al menos una cancha'); return; }
    if (!selectedHorarios || selectedHorarios.length === 0) { alert('Seleccione al menos un horario que esté disponible en todas las canchas'); return; }
    setProgress('Creando torneo...');
    try {
      const torResp = await torneosService.crear({ nombre, descripcion, canchas: canchaIds });
      const torneo_id = torResp?.torneo_id ?? torResp?.id ?? null;
      if (!torneo_id) {
        throw new Error('No se obtuvo id de torneo al crear');
      }
      const dates = buildDates();
      let created = 0;
      let errors = [];
      for (let i=0;i<dates.length;i++){
        const d = dates[i];
        const fecha = d.toISOString().slice(0,10);
        for (let j=0;j<canchaIds.length;j++){
          const cancha_id = canchaIds[j];
          const canchaDetail = await canchasService.BuscarPorId({ id: cancha_id }).catch(()=>null);
          const precio = canchaDetail?.precio_final ?? canchaDetail?.tipo_precio ?? 0;
          for (let k=0;k<selectedHorarios.length;k++){
            const hid = selectedHorarios[k].id;
            try {
              await reservasService.Grabar({ cancha_id, fecha, horario_ids: [hid], cliente_dni: clienteDni, precio, torneo_id });
              created += 1;
            } catch (e) {
              errors.push({ cancha_id, fecha, horario_id: hid, error: e?.response?.data || String(e) });
            }
          }
        }
      }
      setProgress(`Reservas creadas: ${created}` + (errors.length? `, errores: ${errors.length}`: ''));
      alert(`Torneo creado (id ${torneo_id}). Reservas creadas: ${created}. Errores: ${errors.length}`);
    } catch (e) {
      console.error(e);
      setProgress('Error');
      alert('Error creando torneo y/o reservas: ' + (e?.message || JSON.stringify(e)));
    }
  };

  return (
    <>
      <div className="row mb-2">
        <div className="col-sm-4 col-md-3 offset-md-1"></div>
        <div className="col-sm-8 col-md-6">
          <div className="subtitle">Programación de reservas</div>
        </div>
      </div>
      <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label">Fecha inicio:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="date" className="form-control" value={startDate} onChange={e=>setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label">Fecha fin (opcional):</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="date" className="form-control" value={endDate} onChange={e=>setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label">Hora inicio:</label>
            </div>
            <div className="col-sm-3 col-md-2">
              <input type="time" className="form-control" value={startTime} onChange={e=>setStartTime(e.target.value)} />
            </div>
            <div className="col-sm-4 col-md-3">
              <label className="col-form-label">Duración (horas):</label>
            </div>
            <div className="col-sm-1 col-md-1">
              <input type="number" min="1" className="form-control" value={durationHours} onChange={e=>setDurationHours(e.target.value)} />
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label">Intervalo entre fechas (días):</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="number" min="1" className="form-control" value={intervalDays} onChange={e=>setIntervalDays(e.target.value)} />
            </div>
          </div>

          <hr />
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label">Fecha para comprobar horarios:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <div className="d-flex">
                <input type="date" className="form-control" value={checkDate} onChange={e=>{ setCheckDate(e.target.value); }} />
                <button type="button" className="btn btn-outline-secondary ms-2" onClick={()=>loadCommonHorarios(checkDate)}>Cargar horarios comunes</button>
              </div>
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label">Horarios disponibles (comunes):</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <div className="d-flex gap-2 flex-wrap align-items-center">
                {(availableSlots || []).map(s => (
                  <button key={s.id} type="button" className="btn btn-sm btn-outline-primary" onClick={()=>agregarHorarioSeleccionado(s)}>{s.label}</button>
                ))}
                {(!availableSlots || availableSlots.length===0) && <div className="text-muted">No hay horarios comunes cargados</div>}
              </div>
              <small className="form-text text-muted">Seleccione los horarios que deben reservarse en todas las canchas</small>
            </div>
          </div>

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
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-sm-4 col-md-3 offset-md-1"></div>
            <div className="col-sm-8 col-md-6 text-center">
              <button type="button" className="btn btn-success me-2" onClick={() => crearTorneoYReservas(nombre, descripcion, clienteDni)}>Crear torneo y reservas</button>
              <button type="button" className="btn btn-warning ms-2" onClick={() => { if (onCancel) return onCancel(); setStartDate(''); setEndDate(''); setStartTime('10:00'); setDurationHours(2); setIntervalDays(1); setProgress(null); setAvailableSlots([]); setSelectedHorarios([]); setCheckDate(''); }}>
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
    </>
  );
}

export default ReservaBatchForm;
