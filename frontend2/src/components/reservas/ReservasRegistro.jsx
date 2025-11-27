import React, { useEffect } from "react";
import { useForm } from "react-hook-form";

const validateDate = (value) => {
  const selectedDate = new Date(value);
  const currentDate = new Date();
  
  selectedDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  
  return selectedDate <= currentDate || "La fecha no puede ser mayor a la fecha actual";
};

export default function ReservasRegistro({
  AccionABMC,
  Item,
  Grabar,
  Volver,
  Canchas,
  Clientes,
  Func
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isValid, isSubmitted },
  } = useForm({ values: Item });

  const onSubmit = (data) => {
    // convert horario csv to array
    if (data.horario_ids_csv) {
      const ids = data.horario_ids_csv.split(',').map(s => s.trim()).filter(s => s !== '').map(s => parseInt(s,10));
      data.horario_ids = ids;
      delete data.horario_ids_csv;
    }
    Grabar(data, Func);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="container-fluid">

        <fieldset disabled={AccionABMC === "C"}>

          {/* Cancha */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="cancha_id">Cancha<span className="text-danger">*</span>:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              {Canchas ? (
                <select {...register("cancha_id", { required: { value: true, message: "Cancha es requerida" } })} className={"form-control " + (errors?.cancha_id ? "is-invalid" : "") }>
                  <option value=""></option>
                  {Canchas.map(c => <option key={c.id} value={c.id}>{c.nombre ?? `Cancha ${c.id}`}</option>)}
                </select>
              ) : (
                <input type="number" {...register("cancha_id", { required: { value: true, message: "Cancha es requerida" } })} className={"form-control " + (errors?.cancha_id ? "is-invalid" : "") } />
              )}
              <div className="invalid-feedback">{errors?.cancha_id?.message}</div>
            </div>
          </div>

          {/* Cliente */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="cliente_dni">Cliente (DNI)<span className="text-danger">*</span>:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              {Clientes ? (
                <select {...register("cliente_dni", { required: { value: true, message: "Cliente es requerido" } })} className={"form-control " + (errors?.cliente_dni ? "is-invalid" : "") }>
                  <option value=""></option>
                  {Clientes.map(c => <option key={c.dni ?? c.DNI} value={c.dni ?? c.DNI}>{c.nombre ?? c.Nombre}</option>)}
                </select>
              ) : (
                <input type="text" {...register("cliente_dni", { required: { value: true, message: "Cliente es requerido" } })} className={"form-control " + (errors?.cliente_dni ? "is-invalid" : "") } />
              )}
              <div className="invalid-feedback">{errors?.cliente_dni?.message}</div>
            </div>
          </div>

          {/* Fecha */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="fecha">Fecha<span className="text-danger">*</span>:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="date" {...register("fecha", { required: { value: true, message: "Fecha es requerida" }, validate: validateDate })} className={"form-control " + (errors?.fecha ? "is-invalid" : "") } />
              <div className="invalid-feedback">{errors?.fecha?.message}</div>
            </div>
          </div>

          {/* Horarios (ids csv) */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="horario_ids_csv">Horarios (ids, coma-sep)<span className="text-danger">*</span>:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="text" {...register("horario_ids_csv", { required: { value: true, message: "Horarios son requeridos" } })} className={"form-control " + (errors?.horario_ids_csv ? "is-invalid" : "") } />
              <div className="invalid-feedback">{errors?.horario_ids_csv?.message}</div>
            </div>
          </div>

          {/* Precio */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="precio">Precio<span className="text-danger">*</span>:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="number" step=".01" {...register("precio", { required: { value: true, message: "Precio es requerido" } })} className={"form-control " + (errors?.precio ? "is-invalid" : "") } />
              <div className="invalid-feedback">{errors?.precio?.message}</div>
            </div>
          </div>

        </fieldset>

        <hr />
        <div className="row justify-content-center">
          <div className="col text-center botones">
            {AccionABMC !== "C" && (
              <button type="submit" className="btn btn-primary"><i className="fa fa-check"></i> Grabar</button>
            )}
            <button type="button" className="btn btn-warning" onClick={() => Volver()}>
              <i className="fa fa-undo"></i>
              {AccionABMC === "C" ? " Volver" : " Cancelar"}
            </button>
          </div>
        </div>

        {!isValid && isSubmitted && (
          <div className="row alert alert-danger mensajesAlert"><i className="fa fa-exclamation-sign"></i>Revisar los datos ingresados...</div>
        )}

      </div>
    </form>
  );
}
