import React from "react";
import moment from "moment";
import modalDialogService from "../../services/modalDialog.service";

export default function ReservasListado({
  Items,
  Consultar,
  Modificar,
  ActivarDesactivar,
}) {
  return (
    <div className="table-responsive">
      <table className="table table-hover table-sm table-bordered table-striped">
        <thead>
          <tr>
            <th className="text-center">ID</th>
            <th className="text-center">Cancha</th>
            <th className="text-center">Cliente</th>
            <th className="text-center">Fecha</th>
            <th className="text-center">Horarios</th>
            <th className="text-center">Precio</th>
            <th className="text-center text-nowrap">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {Items &&
            Items.map((Item) => (
              <tr key={Item.id ?? Item.Id}>
                <td>{Item.id ?? Item.Id}</td>
                <td>{Item.cancha_nombre ?? Item.cancha ?? (Item.cancha_id ? `#${Item.cancha_id}` : '')}</td>
                <td>{Item.cliente_nombre ?? Item.cliente_dni}</td>
                <td className="text-end">{moment(Item.fecha).format("DD/MM/YYYY")}</td>
                <td className="text-start">{(Item.horarios_label && Item.horarios_label.length>0) ? Item.horarios_label.join(', ') : (Array.isArray(Item.horarios) ? Item.horarios.map(h=> (h?.inicio && h?.fin) ? `${h.inicio}-${h.fin}` : (h?.id ?? '') ).filter(x=>x).join(', ') : '')}</td>
                <td className="text-end">{Item.precio}</td>
                <td className="text-center text-nowrap">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    title="Consultar"
                    onClick={() => Consultar(Item)}
                  >
                    <i className="fa fa-eye"></i>
                  </button>
                  {(() => {
                    // determine if reservation is finished: fecha < today OR fecha == today and current time past latest horario.fin
                    let isFinished = false;
                    try {
                      const fecha = Item.fecha;
                      if (fecha) {
                        const resDate = new Date(fecha + 'T00:00:00');
                        const today = new Date();
                        const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        if (resDate < todayYMD) {
                          isFinished = true;
                        } else if (resDate.getTime() === todayYMD.getTime()) {
                          // check horarios, handling overnight slots where fin <= inicio
                          const hs = Item.horarios || [];
                          let maxEndMin = null;
                          let earliestStartMin = null;
                          hs.forEach(h => {
                            const inicio = h?.inicio;
                            const fin = h?.fin;
                            if (inicio && fin) {
                              const partsI = inicio.split(":");
                              const partsF = fin.split(":");
                              const ih = parseInt(partsI[0]);
                              const im = partsI.length>1?parseInt(partsI[1]):0;
                              const fh = parseInt(partsF[0]);
                              const fm = partsF.length>1?parseInt(partsF[1]):0;
                              if (!Number.isNaN(ih) && !Number.isNaN(fh)) {
                                const startMin = ih*60 + (Number.isNaN(im)?0:im);
                                let endMin = fh*60 + (Number.isNaN(fm)?0:fm);
                                if (endMin <= startMin) endMin += 24*60;
                                if (earliestStartMin === null || startMin < earliestStartMin) earliestStartMin = startMin;
                                if (maxEndMin === null || endMin > maxEndMin) maxEndMin = endMin;
                              }
                            }
                          });
                          if (maxEndMin !== null) {
                            const now = new Date();
                            const nowMin = now.getHours()*60 + now.getMinutes();
                            let nowComp = nowMin;
                            if (maxEndMin > 24*60 && earliestStartMin !== null && nowMin < earliestStartMin) {
                              nowComp = nowMin + 24*60;
                            }
                            if (nowComp > maxEndMin) isFinished = true;
                          }
                        }
                      }
                    } catch (e) {
                      isFinished = false;
                    }

                    return (
                      <button
                        className={"btn btn-sm btn-outline-primary"}
                        title={isFinished?"No se puede modificar: reserva finalizada":"Modificar"}
                        onClick={() => {
                          if (isFinished) modalDialogService.Alert("La reserva ya finalizó y no puede modificarse.");
                          else Modificar(Item);
                        }}
                        disabled={isFinished}
                      >
                        <i className="fa fa-pencil"></i>
                      </button>
                    );
                  })()}
                  <button
                    className={
                      "btn btn-sm " +
                      "btn-outline-danger"
                    }
                    title={"Eliminar"}
                    onClick={() => ActivarDesactivar(Item)}
                  >
                    <i className={"fa fa-times"}></i>
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
