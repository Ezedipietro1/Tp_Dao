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

  const toggleCancha = (id) => {
    setSelectedCanchas(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  const save = async () => {
    const payload = { nombre, descripcion, canchas: selectedCanchas };
    try {
      if (torneo && torneo.id) await torneosService.actualizar(torneo.id, payload);
      else await torneosService.crear(payload);
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

        <ReservaBatchForm canchaIds={selectedCanchas} nombre={nombre} descripcion={descripcion} clienteDni={clienteDni} onCancel={onCancel} />
      </div>
    </form>
  );
}

export default TorneoForm;
