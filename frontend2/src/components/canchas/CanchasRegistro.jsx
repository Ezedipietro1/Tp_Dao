import React, { useEffect, useState } from "react";
import Select from 'react-select';
import { useForm } from "react-hook-form";
import { canchasService } from "../../services/canchas.service";

const validateDate = (value) => {
  const selectedDate = new Date(value);
  const currentDate = new Date();
  
  // Eliminar la hora, minutos, segundos y milisegundos para una comparación más precisa
  selectedDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  
  return selectedDate <= currentDate || "La fecha no puede ser mayor a la fecha actual";
};

export default function CanchasRegistro({
  AccionABMC,
  Item,
  Grabar,
  Volver,
  Func
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, touchedFields, isValid, isSubmitted },
  } = useForm({ values: Item });

  const [tipos, setTipos] = useState(null);
  const [serviciosOpt, setServiciosOpt] = useState(null);

  useEffect(() => {
    // when Item changes (from BuscarPorId), reset the form values
    if (Item) {
      const copy = { ...Item };
      // if backend returns servicios as objects, convert to array of ids for the checkboxes
      if (Array.isArray(Item.servicios)) {
        copy.servicio_ids = Item.servicios.map(s => s.id ?? s.ID ?? s.Id).filter(Boolean);
      }
      // ensure tipo_cancha_id is a string for the input field
      if (copy.tipo_cancha_id !== undefined && copy.tipo_cancha_id !== null) {
        copy.tipo_cancha_id = String(copy.tipo_cancha_id);
      } else if (Item.tipo && (Item.tipo.id !== undefined || Item.tipo.Id !== undefined)) {
        copy.tipo_cancha_id = String(Item.tipo.id ?? Item.tipo.Id);
      } else if (Item.tipo_cancha !== undefined && Item.tipo_cancha !== null) {
        copy.tipo_cancha_id = String(Item.tipo_cancha);
      }
      // set precio_final from any available property on item if present
      if (copy.precio_final === undefined || copy.precio_final === null) {
        copy.precio_final = Item.precio_final ?? Item.precio_por_hora ?? Item.Precio ?? 0;
      }
      reset(copy);
    } else {
      // clear form when no Item
      reset({ tipo_cancha_id: '', servicio_ids: [], precio_final: 0 });
    }
  }, [Item, reset]);

  // load tipos and servicios for the selects
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [tps, svs] = await Promise.all([canchasService.ListarTipos(), canchasService.ListarServicios()]);
        if (!mounted) return;
        setTipos(tps || []);
        setServiciosOpt(svs || []);

        // If we're editing/consulting an Item, compute and set precio_final from the loaded tipo/servicios
        if (Item) {
          // resolve tipo id from possible shapes
          let tipoVal = Item.tipo_cancha_id ?? Item.tipo_cancha ?? (Item.tipo && (Item.tipo.id ?? Item.tipo.Id));
          // resolve servicio ids from possible shapes
          let servicioIds = [];
          if (Array.isArray(Item.servicios)) {
            servicioIds = Item.servicios.map(s => s.id ?? s.ID ?? s.Id).filter(Boolean);
          } else if (Array.isArray(Item.servicio_ids)) {
            servicioIds = Item.servicio_ids.map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
          }

          // compute price using loaded lists
          let precio = 0;
          if (tps && tipoVal !== undefined && tipoVal !== null) {
            const t = tps.find(x => String(x.id) === String(tipoVal) || x.id === tipoVal);
            if (t && t.precio) precio += Number(t.precio) || 0;
          }
          if (svs && servicioIds.length > 0) {
            servicioIds.forEach(sid => {
              const sv = svs.find(x => String(x.id) === String(sid) || x.id === sid);
              if (sv && sv.precio) precio += Number(sv.precio) || 0;
            });
          }
          // ensure the form shows the tipo and servicio selections
          if (tipoVal !== undefined && tipoVal !== null) setValue('tipo_cancha_id', String(tipoVal));
          if (servicioIds && servicioIds.length > 0) setValue('servicio_ids', servicioIds);
          setValue('precio_final', precio);
        }
      } catch (err) {
        // ignore — modal will show on submit if needed
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const onSubmit = (data) => {
    // convert tipo_cancha_id to integer
    if (data.tipo_cancha_id !== undefined && data.tipo_cancha_id !== null) {
      const tipoInt = parseInt(String(data.tipo_cancha_id).trim(), 10);
      data.tipo_cancha_id = Number.isNaN(tipoInt) ? null : tipoInt;
    }
    // if user provided servicios as CSV, convert to array of ints
    if (data.servicio_ids_csv) {
      const ids = data.servicio_ids_csv
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map((s) => parseInt(s, 10))
        .filter(n => !Number.isNaN(n));
      data.servicio_ids = ids;
      delete data.servicio_ids_csv;
    } else if (data.servicio_ids) {
      // ensure servicio_ids is array of ints
      data.servicio_ids = (data.servicio_ids || []).map(s => parseInt(s, 10)).filter(n => !Number.isNaN(n));
    }

    // precio_final: ensure numeric if provided
    if (data.precio_final !== undefined) {
      const pf = parseFloat(data.precio_final);
      if (!Number.isNaN(pf)) data.precio_final = pf;
      else delete data.precio_final;
    }

    Grabar(data, Func);
  };

  // compute precio_final when tipo or servicios change
  const computePrecio = (tipoId, servicioIds) => {
    let precio = 0;
    if (tipos && tipoId) {
      const t = tipos.find(x => String(x.id) === String(tipoId) || x.id === tipoId);
      if (t && t.precio) precio += Number(t.precio) || 0;
    }
    if (serviciosOpt && servicioIds && servicioIds.length > 0) {
      servicioIds.forEach(sid => {
        const sv = serviciosOpt.find(x => String(x.id) === String(sid) || x.id === sid);
        if (sv && sv.precio) precio += Number(sv.precio) || 0;
      });
    }
    return precio;
  };

  // watch tipo_cancha_id and servicio_ids to update precio_final automatically
  useEffect(() => {
    const unwatch = () => {};
    try {
      const tipoVal = watch("tipo_cancha_id");
      const servicioIds = watch("servicio_ids") || [];
      const precio = computePrecio(tipoVal, servicioIds);
      setValue("precio_final", precio);
    } catch (e) {
      // watch may throw during unmount; ignore
    }
    return unwatch;
  }, [watch("tipo_cancha_id"), watch("servicio_ids")]);

  // watch tipo_cancha_id and servicio_ids via DOM change handlers below and update precio_final using setValue

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="container-fluid">

        <fieldset disabled={AccionABMC === "C"}>

          {/* NOTE: Precio will be rendered at the end of the form (see below) */}

          {/* campo Tipo de Cancha (select) */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="tipo_cancha_id">Tipo Cancha{AccionABMC !== "C" && <span className="text-danger">*</span>}:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <select
                name="tipo_cancha_id"
                value={String(watch("tipo_cancha_id") || "")}
                disabled={AccionABMC === "C"}
                onChange={(e) => {
                  const val = e.target.value;
                  setValue('tipo_cancha_id', val);
                  const serviciosCurrent = watch("servicio_ids") || [];
                  const precio = computePrecio(val, serviciosCurrent);
                  setValue('precio_final', precio);
                }}
                className={"form-control " + (errors?.tipo_cancha_id ? "is-invalid" : "") }
              >
                <option value=""></option>
                {(tipos || []).map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} — ${t.precio}</option>
                ))}
              </select>
              <div className="invalid-feedback">{errors?.tipo_cancha_id?.message}</div>
            </div>
          </div>

          {/* campo Servicios (checkboxes para selección por click) */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="servicio_ids">Servicios:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <div style={{ minHeight: 60 }}>
                <Select
                  isMulti
                  name="servicio_ids"
                  options={(serviciosOpt || []).map(s => ({ value: s.id, label: `${s.nombre} — $${s.precio}`, precio: s.precio }))}
                  classNamePrefix="react-select"
                  value={(watch("servicio_ids") || []).map(id => {
                    const s = (serviciosOpt || []).find(x => String(x.id) === String(id) || x.id === id);
                    return s ? { value: s.id, label: `${s.nombre} — $${s.precio}` } : null;
                  }).filter(Boolean)}
                  onChange={(selected) => {
                    const ids = (selected || []).map(s => s.value);
                    setValue('servicio_ids', ids);
                    const tipoVal = watch("tipo_cancha_id");
                    const precio = computePrecio(tipoVal, ids);
                    setValue('precio_final', precio);
                  }}
                    isDisabled={AccionABMC === "C"}
                />
              </div>
              <small className="form-text text-muted">Seleccione uno o más servicios</small>
            </div>
          </div>

          {/* 'has_reservas' removed as requested */}

          {/* campo Precio (calculado) - moved to bottom as requested */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="precio_final">Precio Final:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="number" step=".01" {...register("precio_final")} className={"form-control"} disabled />
            </div>
          </div>

          
        </fieldset>

        {/* Botones Grabar, Cancelar/Volver' */}
        <hr />
        <div className="row justify-content-center">
          <div className="col text-center botones">
            {AccionABMC !== "C" && (
              <button type="submit" className="btn btn-primary">
                <i className="fa fa-check"></i> Grabar
              </button>
            )}
            <button
              type="button"
              className="btn btn-warning"
              onClick={() => Volver()}
            >
              <i className="fa fa-undo"></i>
              {AccionABMC === "C" ? " Volver" : " Cancelar"}
            </button>
          </div>
        </div>

        {/* texto: Revisar los datos ingresados... */}
        {!isValid && isSubmitted && (
          <div className="row alert alert-danger mensajesAlert">
            <i className="fa fa-exclamation-sign"></i>
            Revisar los datos ingresados...
          </div>
        )}

      </div>
    </form>
  );
}
