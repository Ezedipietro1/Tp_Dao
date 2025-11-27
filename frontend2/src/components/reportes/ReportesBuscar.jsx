import React from "react";

export function ReportesBuscar({ desde, hasta, setDesde, setHasta, canchaId, setCanchaId, Buscar, DescargarPDF }) {
	return (
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
					<label>ID Cancha</label>
					<input className="form-control" type="text" value={canchaId} onChange={(e) => setCanchaId(e.target.value)} />
				</div>
				<div className="col-md-3 d-flex align-items-end">
					<div>
						<button className="btn btn-primary me-2" onClick={() => Buscar()}><i className="fa fa-search"></i> Buscar</button>
						<button className="btn btn-secondary" onClick={() => DescargarPDF()}><i className="fa fa-file-pdf-o"></i> PDF</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ReportesBuscar;
