import { useState } from "react";
import { reportesService } from "../../services/reportes.service";
import modalDialogService from "../../services/modalDialog.service";

function Reportes() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [canchaId, setCanchaId] = useState("");
  const [Items, setItems] = useState(null);

  async function Buscar() {
    try {
      modalDialogService.BloquearPantalla(true);
      const data = await reportesService.jsonReservasPorCanchas(desde, hasta, false);
      modalDialogService.BloquearPantalla(false);
      setItems(data || []);
    } catch (err) {
      modalDialogService.BloquearPantalla(false);
      modalDialogService.Alert(err?.response?.data?.message ?? err.toString());
    }
  }

  async function DescargarPDF() {
    if (!canchaId) {
      modalDialogService.Alert("Ingrese el id de la cancha para descargar el PDF.");
      return;
    }
    try {
      modalDialogService.BloquearPantalla(true);
      const resp = await reportesService.getReservasPorCancha(canchaId, desde, hasta, { download: true });
      modalDialogService.BloquearPantalla(false);
      // crear blob y descargar
      const blob = new Blob([resp.data], { type: resp.headers["content-type"] || "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_reservas_cancha_${canchaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      modalDialogService.BloquearPantalla(false);
      modalDialogService.Alert(err?.response?.data?.message ?? err.toString());
    }
  }

  return (
    <div>
      <div className="tituloPagina">Reportes</div>

      <div className="card card-body mb-3">
        <div className="row">
          <div className="col-md-3">
            <label>Desde</label>
            <input className="form-control" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label>Hasta</label>
            <input className="form-control" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label>ID Cancha (opcional para PDF)</label>
            <input className="form-control" type="text" value={canchaId} onChange={(e) => setCanchaId(e.target.value)} />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <div>
              <button className="btn btn-primary me-2" onClick={() => Buscar()}><i className="fa fa-search"></i> Buscar</button>
              <button className="btn btn-secondary" onClick={() => DescargarPDF()}><i className="fa fa-file-pdf-o"></i> Descargar PDF</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        {Items && Items.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-sm table-striped table-bordered">
              <thead>
                <tr>
                  <th>Cancha ID</th>
                  <th>Nombre Cancha</th>
                  <th>Total Reservas</th>
                  <th>Detalles (JSON)</th>
                </tr>
              </thead>
              <tbody>
                {Items.map((r) => (
                  <tr key={r.cancha_id ?? r.id}>
                    <td>{r.cancha_id ?? r.id}</td>
                    <td>{r.cancha_nombre ?? r.nombre ?? "-"}</td>
                    <td>{r.total_reservas ?? r.count ?? (r.reservas ? r.reservas.length : "-")}</td>
                    <td style={{ maxWidth: 400, overflow: "auto" }}><pre style={{ margin: 0 }}>{JSON.stringify(r, null, 2)}</pre></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">No se encontraron registros.</div>
        )}
      </div>
    </div>
  );
}

export { Reportes };
