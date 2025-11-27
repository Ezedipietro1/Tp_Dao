import React, { useEffect } from "react";
import { useForm } from "react-hook-form";

const validateDate = (value) => {
  const selectedDate = new Date(value);
  const currentDate = new Date();
  
  selectedDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  
  return selectedDate <= currentDate || "La fecha no puede ser mayor a la fecha actual";
};

export default function ClientesRegistro({ AccionABMC, Item, Grabar, Volver, Func }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitted },
  } = useForm({ defaultValues: Item });

  const onSubmit = (data) => {
    Grabar(data, Func);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="container-fluid">

        <fieldset disabled={AccionABMC === "C"}>

          {/* DNI */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="dni">DNI<span className="text-danger">*</span>:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="text" disabled={AccionABMC === "M"} {...register("dni", { required: { value: true, message: "DNI es requerido" }, pattern: { value: /^\d{7,8}$/, message: "DNI debe tener 7 u 8 dígitos" } })} className={"form-control " + (errors?.dni ? "is-invalid" : "") } />
              <div className="invalid-feedback">{errors?.dni?.message}</div>
            </div>
          </div>

          {/* Nombre */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="nombre">Nombre<span className="text-danger">*</span>:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="text" {...register("nombre", { required: { value: true, message: "Nombre es requerido" }, pattern: { value: /^\p{L}+(?:[\s'\-]\p{L}+)*$/u, message: "Nombre sólo debe contener letras y espacios" } })} className={"form-control " + (errors?.nombre ? "is-invalid" : "") } />
              <div className="invalid-feedback">{errors?.nombre?.message}</div>
            </div>
          </div>

          {/* Telefono */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="telefono">Teléfono:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="tel" maxLength="10" {...register("telefono", { pattern: { value: /^\d{10}$/, message: "Teléfono debe contener exactamente 10 dígitos" } })} className={"form-control " + (errors?.telefono ? "is-invalid" : "") } />
              <div className="invalid-feedback">{errors?.telefono?.message}</div>
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
