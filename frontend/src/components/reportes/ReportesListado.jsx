import React from "react";

export function ReportesListado({ Items }) {
	return (
		<div className="table-responsive">
			<table className="table table-sm table-striped table-bordered">
				<thead>
					<tr>
						<th>Cancha ID</th>
						<th>Nombre</th>
						<th>Total</th>
						<th>Detalles</th>
					</tr>
				</thead>
				<tbody>
					{Items?.map((r) => (
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
	);
}

export default ReportesListado;
