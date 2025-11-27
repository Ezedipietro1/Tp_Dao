import React, { useEffect, useState } from 'react';
import { canchasService } from '../../services/canchas.service';
import { torneosService } from '../../services/torneos.service';
import TorneoForm from './TorneoForm';

function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await torneosService.listar();
        setTorneos(data || []);
      } catch (e) {
        console.error('Error cargando torneos', e);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const onSaved = async () => {
    const data = await torneosService.listar();
    setTorneos(data || []);
    setEditing(null);
  };

  return (
    <div>
      <div className="tituloPagina">
        Torneos
      </div>

      <div className="container-fluid mb-3">
        <div className="d-flex justify-content-end mb-2">
          <button className="btn btn-primary" onClick={() => setEditing({})}>Crear torneo</button>
        </div>

        {editing && (
          <div className="mb-3">
            <TorneoForm torneo={editing} onCancel={() => setEditing(null)} onSaved={onSaved} />
          </div>
        )}

        {loading ? (
          <div>Cargando...</div>
        ) : (
          <div className="list-group">
            {torneos.length === 0 && <div className="alert alert-info mensajesAlert">No hay torneos.</div>}
            {torneos.map(t => (
              <div key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-bold">{t.nombre}</div>
                  <div className="small text-muted">{t.descripcion}</div>
                </div>
                <div>
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => setEditing(t)}>Editar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { Torneos };
