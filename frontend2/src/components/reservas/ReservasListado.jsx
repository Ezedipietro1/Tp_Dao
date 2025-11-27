import React from "react";
import moment from "moment";

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
            <th className="text-center">Precio</th>
            <th className="text-center text-nowrap">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {Items &&
            Items.map((Item) => (
              <tr key={Item.id ?? Item.Id}>
                <td>{Item.id ?? Item.Id}</td>
                <td>{Item.cancha_nombre ?? Item.cancha}</td>
                <td>{Item.cliente_nombre ?? Item.cliente_dni}</td>
                <td className="text-end">{moment(Item.fecha).format("DD/MM/YYYY")}</td>
                <td className="text-end">{Item.precio}</td>
                <td className="text-center text-nowrap">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    title="Consultar"
                    onClick={() => Consultar(Item)}
                  >
                    <i className="fa fa-eye"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    title="Modificar"
                    onClick={() => Modificar(Item)}
                  >
                    <i className="fa fa-pencil"></i>
                  </button>
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
