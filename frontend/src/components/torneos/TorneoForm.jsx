import React, { useEffect, useState } from 'react';
import { canchasService } from '../../services/canchas.service';
import { torneosService } from '../../services/torneos.service';
import ReservaBatchForm from './ReservaBatchForm';
import Select from 'react-select';
import { clientesService } from '../../services/clientes.service';

function TorneoForm({ torneo = {}, onCancel, onSaved }) {
  const [nombre, setNombre] = useState(torneo.nombre || '');
  const [descripcion, setDescripcion] = useState(torneo.descripcion || '');
  const [selectedCanchas, setSelectedCanchas] = useState(torneo.canchas || []);
  const [canchas, setCanchas] = useState([]);
  // show the batch scheduler always now
  const [clienteDni, setClienteDni] = useState('');
  const [clientes, setClientes] = useState([]);
  const [selectedClientOption, setSelectedClientOption] = useState(null);

  // when the `torneo` prop changes (e.g., entering edit mode), sync local state
  useEffect(() => {
    try {
      setNombre(torneo?.nombre || '');
      setDescripcion(torneo?.descripcion || '');
      setSelectedCanchas(torneo?.canchas || []);
      // if torneo provides a cliente_dni (optional), prefill it
      if (torneo && torneo.cliente_dni) {
        setClienteDni(torneo.cliente_dni);
      }
    } catch (e) {
      // ignore
    }
  }, [torneo]);

  useEffect(() => {
    (async () => {
      try { const cs = await canchasService.Buscar(); setCanchas(cs || []); } catch(e){ console.error(e); }
    })();
    // load clientes for react-select
    (async () => {
      try {
        const list = await clientesService.Buscar();
        setClientes(list || []);
      } catch (err) {
        console.error('Error cargando clientes', err);
      }
    })();
  }, []);

  // when clientes list is loaded and we have a clienteDni, try to select the matching option
  useEffect(() => {
    if (!clientes || clientes.length === 0) return;
    if (!clienteDni) return;
    const match = clientes.find(c => String(c.dni || c.DNI || c.id) === String(clienteDni));
    if (match) {
      const opt = { value: match.dni || match.DNI || match.id, label: `${match.dni || match.DNI || match.id} - ${match.nombre || ''} ${match.apellido || ''}` };
      setSelectedClientOption(opt);
    }
  }, [clientes, clienteDni]);

  const toggleCancha = (id) => {
    setSelectedCanchas(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  const save = async (reservasData = null) => {
    const payload = { nombre, descripcion, canchas: selectedCanchas, cliente_dni: clienteDni };
    try {
      if (torneo && torneo.id) {
        await torneosService.actualizar(torneo.id, payload);
        // if reservasData provided, synchronize reservas for this torneo
        if (reservasData) {
          try {
            await torneosService.syncReservas(torneo.id, reservasData);
          } catch (e) {
            console.error('Error sincronizando reservas del torneo', e);
          }
        }
      } else {
        await torneosService.crear(payload);
      }
      onSaved && onSaved();
    } catch (e) { console.error('Error guardando torneo', e); }
  };

  return (
    <form className="torneo-form" onSubmit={(e)=>{ e.preventDefault(); }}>
      <div className="container-fluid">
          <div className="row mb-2">
            <div className="col">
              <div className="tituloPagina">Registro de Torneo</div>
            </div>
          </div>
        <div className="row mb-2">
          <label className="col-sm-3 col-form-label" htmlFor="torneo-nombre">Nombre <span className="text-danger">*</span></label>
          <div className="col-sm-9">
            <input id="torneo-nombre" className="form-control" value={nombre} onChange={e=>setNombre(e.target.value)} />
          </div>
        </div>

        <div className="row mb-2">
          <label className="col-sm-3 col-form-label" htmlFor="torneo-descripcion">Descripción</label>
          <div className="col-sm-9">
            <input id="torneo-descripcion" className="form-control" value={descripcion} onChange={e=>setDescripcion(e.target.value)} />
          </div>
        </div>

        <div className="row mb-2">
          <label className="col-sm-3 col-form-label" htmlFor="torneo-canchas">Canchas disponibles</label>
          <div className="col-sm-9">
            <div style={{minHeight: 80}}>
              <Select
                isMulti
                inputId="torneo-canchas"
                name="canchas"
                options={(canchas || []).map(c => ({ value: c.id, label: c.nombre || `Cancha ${c.id}` }))}
                classNamePrefix="react-select"
                value={(selectedCanchas || []).map(id => {
                  const s = (canchas || []).find(x => String(x.id) === String(id) || x.id === id);
                  return s ? { value: s.id, label: s.nombre || `Cancha ${s.id}` } : null;
                }).filter(Boolean)}
                onChange={(selected) => {
                  const ids = (selected || []).map(s => s.value);
                  setSelectedCanchas(ids);
                }}
              />
            </div>
            <small className="form-text text-muted">Seleccione una o más canchas para el torneo</small>
          </div>
        </div>

        <div className="row mb-2">
          <label className="col-sm-3 col-form-label" htmlFor="torneo-cliente">Cliente responsable</label>
          <div className="col-sm-9">
            <div style={{ minHeight: 60 }}>
              <Select
                inputId="torneo-cliente"
                name="cliente"
                options={(clientes || []).map(c => ({ value: c.dni || c.DNI || c.id, label: `${c.dni || c.DNI || c.id} - ${c.nombre || ''} ${c.apellido || c.apellido || ''}` }))}
                classNamePrefix="react-select"
                value={selectedClientOption}
                onChange={(opt) => {
                  setSelectedClientOption(opt);
                  setClienteDni(opt ? opt.value : '');
                }}
                isClearable
                placeholder="Seleccione cliente por DNI o nombre"
              />
            </div>
            <small className="form-text text-muted">Seleccione el cliente responsable; su DNI se usará para crear las reservas del torneo</small>
          </div>
        </div>

        <ReservaBatchForm
          canchaIds={selectedCanchas}
          nombre={nombre}
          descripcion={descripcion}
          clienteDni={clienteDni}
          onCancel={onCancel}
          onSaved={onSaved}
          onSave={save}
          initialFecha={torneo?.fecha_inicio}
          isEditing={Boolean(torneo && torneo.id)}
          initialSelectedHorarios={(() => {
            try {
              const rows = torneo && torneo.reservas ? torneo.reservas : [];
              const map = {};
              (rows || []).forEach(r => {
                (r.horarios || []).forEach(h => {
                  const label = (h.inicio && h.fin) ? `${h.inicio}-${h.fin}` : (h.id ? String(h.id) : null);
                  if (!label) return;
                  if (!map[label]) map[label] = { id: h.id, inicio: h.inicio, fin: h.fin, label };
                });
              });
              return Object.values(map);
            } catch (e) { return []; }
          })()} />
      </div>
    </form>
  );
}

export default TorneoForm;
