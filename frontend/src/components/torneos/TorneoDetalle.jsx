import React, { useEffect, useState } from 'react';
import { torneosService } from '../../services/torneos.service';
import ReservaBatchForm from './ReservaBatchForm';

function TorneoDetalle({ torneoId, onCancel = null }){
  const [torneo, setTorneo] = useState(null);

  useEffect(()=>{
    (async()=>{
      try { const t = await torneosService.obtener(torneoId); setTorneo(t); } catch(e){ console.error(e); }
    })();
  }, [torneoId]);

  if (!torneo) return <div>Cargando torneo...</div>;

  return (
    <div>
      <h3>{torneo.nombre}</h3>
      <p className="text-muted">{torneo.descripcion}</p>
      <div className="mb-3">
        <h5>Canchas asignadas</h5>
        <ul>
          {(torneo.canchas || []).map(c=> <li key={c}>{`Cancha ${c}`}</li>)}
        </ul>
      </div>
      <div>
        <ReservaBatchForm canchaIds={torneo.canchas || []} onCancel={onCancel} viewOnly={true} fechaReservas={torneo.fecha_inicio} />
      </div>
    </div>
  );
}

export default TorneoDetalle;
