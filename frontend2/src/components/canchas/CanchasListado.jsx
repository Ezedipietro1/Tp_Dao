import React from "react";
import moment from "moment";

export default function CanchasListado({
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
            <th className="text-center">Nombre</th>
            <th className="text-center">Precio</th>
            <th className="text-center">Tipo Cancha</th>
            <th className="text-center">Reservas</th>
            <th className="text-center text-nowrap">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {Items &&
            Items.map((Item) => (
              <tr key={Item.id ?? Item.Id}>
                <td>{Item.id ?? Item.Id}</td>
                <td>{Item.nombre ?? Item.Nombre}</td>
                <td className="text-end">{Item.precio_por_hora ?? Item.precio_final ?? Item.Precio}</td>
                <td style={{ textAlign: 'left' }}>{Item.tipo_cancha_id ?? Item.tipo_cancha ?? (Item.tipo?.nombre ?? '')}</td>
                <td>{(Item.has_reservas ?? false) ? "SI" : "NO"}</td>
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
                      (Item.has_reservas
                        ? "btn-outline-secondary" // no permitir eliminar cuando tiene reservas
                        : "btn-outline-danger")
                    }
                    title={Item.has_reservas ? "No se puede eliminar: tiene reservas" : "Eliminar"}
                    onClick={() => ActivarDesactivar(Item)}
                    disabled={Item.has_reservas}
                    aria-disabled={Item.has_reservas}
                  >
                    <i
                      className={"fa fa-" + (Item.has_reservas ? "ban" : "times")}
                    ></i>
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
