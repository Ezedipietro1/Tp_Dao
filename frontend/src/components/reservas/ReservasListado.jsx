import React from "react";
import moment from "moment";
import modalDialogService, { ShowPayment } from "../../services/modalDialog.service";

export default function ReservasListado({
  Items,
  Consultar,
  Modificar,
  ActivarDesactivar,
  Buscar,
  MarcarPagado,
}) {
  return (
    <div className="table-responsive">
      <table className="table table-hover table-sm table-bordered table-striped">
        <thead>
            <tr>
              <th className="text-center">ID</th>
              <th className="text-center">Cancha</th>
              <th className="text-center">Cliente</th>
              <th className="text-center">Estado Pago</th>
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
                <td className="text-center">
                  {Item.estado_pago === 'pagado' ? (
                    <span className="badge bg-success">Pagado</span>
                  ) : (
                    <span className="badge bg-danger">Pendiente</span>
                  )}
                </td>
                <td className="text-end">{moment(Item.fecha).format("DD/MM/YYYY")}</td>
                <td className="text-start">{(Item.horarios_label && Item.horarios_label.length>0) ? Item.horarios_label.join(', ') : (Array.isArray(Item.horarios) ? Item.horarios.map(h=> (h?.inicio && h?.fin) ? `${h.inicio}-${h.fin}` : (h?.id ?? '') ).filter(x=>x).join(', ') : '')}</td>
                <td className="text-end">{Item.precio}</td>
                <td className="text-center text-nowrap">
                  {Item.estado_pago !== 'pagado' && (
                    <button
                      className="btn btn-sm btn-outline-success me-1"
                      title="Pagar"
                      onClick={() => {
                        // debug: confirm click handler is invoked
                        // pago: invocar modal de pago
                        // confirm and process payment for full amount (default metodo 1)
                            ShowPayment(
                              Item,
                              async (methodOrData) => {
                                try {
                                  const method = typeof methodOrData === 'string' ? methodOrData : (methodOrData && methodOrData.method) || 'efectivo';
                                  const card = typeof methodOrData === 'object' && methodOrData.card ? methodOrData.card : null;
                                  const { pagosService } = await import("../../services/pagos.service.js");
                                  // mapa simple de metodos: efectivo -> 1, tarjeta -> 2
                                  const metodoId = method === 'tarjeta' ? 2 : 1;
                                  const resp = await pagosService.RegistrarPago({ reserva_id: Item.id, monto: Item.precio, metodo_pago_id: metodoId });
                                  const pagoId = resp && resp.pago_id;
                                  // mostrar confirmación y opción para descargar recibo
                                  let summary = `Reserva: ${Item.id}\nCancha: ${Item.cancha_nombre}\nCliente: ${Item.cliente_nombre ?? Item.cliente_dni}\nTotal: $${Item.precio}`;
                                  if (method === 'tarjeta' && card && card.number) {
                                    const digits = card.number.replace(/[^0-9]/g, '');
                                    const last4 = digits.length >= 4 ? digits.slice(-4) : digits;
                                    summary += `\nTarjeta: **** **** **** ${last4}`;
                                  }
                                  const reciboUrl = pagoId ? `http://127.0.0.1:5000/pagos/${pagoId}/recibo` : null;
                                  // update UI immediately to show pagado without forcing a refresh
                                  try { if (MarcarPagado) MarcarPagado(Item.id ?? Item.Id); } catch(e) {}

                                  modalDialogService.Confirm(
                                    method === 'efectivo' ? `Pago en efectivo registrado.\n\n${summary}` : `Pago registrado (tarjeta).\n\n${summary}`,
                                    'Pago confirmado',
                                    'Descargar recibo',
                                    'Cerrar',
                                    () => {
                                      if (reciboUrl) window.open(reciboUrl, '_blank');
                                      try { if (Buscar) Buscar(); } catch(e){}
                                    },
                                    null,
                                    'success'
                                  );
                                } catch (err) {
                                  modalDialogService.Alert('Error al registrar el pago: ' + (err?.response?.data?.error || err.message || err), 'Error');
                                }
                              },
                              () => {
                                // cancel handler: do nothing
                              }
                            );
                      }}
                    >
                      <i className="fa fa-dollar"></i>
                    </button>
                  )}
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
