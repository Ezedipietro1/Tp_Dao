import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import Select from "react-select";
import modalDialogService from "../../services/modalDialog.service";
import { reservasService } from "../../services/reservas.service";
import { canchasService } from "../../services/canchas.service";

const validateDate = (value) => {
  if (!value) return "Fecha inválida";
  // expect YYYY-MM-DD from the date input; parse explicitly to avoid timezone issues
  const m = value.toString().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "Formato de fecha inválido";
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const selectedDate = new Date(y, mo, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return selectedDate >= today || "La fecha no puede ser anterior a la fecha actual";
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
  // compute today's date in YYYY-MM-DD for the date input min attribute
  const today = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    formState: { errors, touchedFields, isValid, isSubmitted },
  } = useForm({ defaultValues: Item ?? {} });
  
  const watchedHorariosCsv = watch('horario_ids_csv');
  const [horariosDisplay, setHorariosDisplay] = useState("");
  const [horariosOptions, setHorariosOptions] = useState([]);

  // When Item changes (e.g. Consultar / Modificar) reset the form so all fields
  // are populated. Also convert horario_ids array -> horario_ids_csv for the text input.
  useEffect(() => {
    if (!Item) {
      reset({});
      return;
    }
    const vals = { ...Item };
    // backend may return fecha as ISO datetime; keep only date part for the date input
    if (vals.fecha && typeof vals.fecha === "string") {
      vals.fecha = vals.fecha.split("T")[0];
    }
    // normalize cancha id: backend may provide cancha as object or cancha_id under different keys
    if (!vals.cancha_id) {
      if (vals.cancha && (vals.cancha.id || vals.cancha._id)) {
        vals.cancha_id = vals.cancha.id ?? vals.cancha._id;
      } else if (vals.canchaId) {
        vals.cancha_id = vals.canchaId;
      }
    }
    // normalize cliente dni
    if (!vals.cliente_dni) {
      if (vals.cliente && (vals.cliente.dni || vals.cliente.DNI)) {
        vals.cliente_dni = vals.cliente.dni ?? vals.cliente.DNI;
      } else if (vals.cliente_dni === undefined && vals.clienteId) {
        vals.cliente_dni = vals.clienteId;
      }
    }
    // normalize precio
    if (vals.precio === undefined) {
      vals.precio = vals.precio_final ?? vals._precio_final ?? vals.precio_final ?? vals.precio;
    }

    // If server returned only names (cancha_nombre / cliente_nombre) but not ids,
    // try to find matching id from the provided lookup arrays so selects show the value.
    try {
      if ((!vals.cancha_id || vals.cancha_id === null) && vals.cancha_nombre && Array.isArray(Canchas)) {
        const match = Canchas.find(c => (c.nombre || '').toString().toLowerCase() === (vals.cancha_nombre || '').toString().toLowerCase());
        if (match) vals.cancha_id = match.id ?? match._id;
      }
      if ((!vals.cliente_dni || vals.cliente_dni === null) && vals.cliente_nombre && Array.isArray(Clientes)) {
        const match = Clientes.find(cl => (cl.nombre || cl.Nombre || '').toString().toLowerCase() === (vals.cliente_nombre || '').toString().toLowerCase());
        if (match) vals.cliente_dni = match.dni ?? match.DNI ?? match.id;
      }
    } catch (e) {
      // ignore lookup mapping errors
    }

    // backend may return horarios as array of objects ({id, inicio, fin})
    let computedCsv = null;
    try {
      if (Array.isArray(vals.horario_ids)) {
        computedCsv = vals.horario_ids.join(",");
      } else if (Array.isArray(vals.horarios)) {
        const ids = vals.horarios.map(h => {
          if (!h) return undefined;
          if (h.id !== undefined && h.id !== null) return h.id;
          if (h.Id !== undefined && h.Id !== null) return h.Id;
          if (typeof h.get_id === 'function') {
            try { return h.get_id(); } catch(e) { /* ignore */ }
          }
          // fallback: try numeric parse of any primitive
          if (typeof h === 'number' || typeof h === 'string') return h;
          return undefined;
        }).filter(x => x !== undefined && x !== null);
        if (ids && ids.length > 0) computedCsv = ids.join(",");
      } else if (vals.horario_ids_csv) {
        computedCsv = vals.horario_ids_csv;
      }
    } catch (e) {
      computedCsv = vals.horario_ids_csv || null;
    }

    // horario label fallback
    const labelFallback = Array.isArray(vals.horarios_label) ? vals.horarios_label.join(", ") : (Array.isArray(vals.horarios) ? vals.horarios.map(h => (h?.inicio && h?.fin) ? `${h.inicio}-${h.fin}` : (h?.id ?? '') ).filter(x=>x).join(", ") : "");
    if (computedCsv) vals.horario_ids_csv = computedCsv;
    // set display string (ids preferred, else labels)
    setHorariosDisplay(computedCsv || labelFallback || "");

    reset(vals);
  }, [Item, Canchas, Clientes, reset]);

  const watchedCancha = watch('cancha_id');
  const watchedFecha = watch('fecha');

  // Load horarios disponibles cuando cambian cancha_id o fecha.
  // Also build options from Item.horarios when in Consult mode or when availability endpoint isn't reachable.
  useEffect(() => {
    async function loadDisponibles() {
      try {
        const canchaId = watchedCancha ?? (Item && Item.cancha_id) ?? null;
        const fecha = watchedFecha ?? (Item && Item.fecha) ?? null;
        // If we have both cancha and fecha, ask server for availability
        if (canchaId && fecha) {
          const list = await reservasService.ListarHorariosDisponibles({ cancha_id: canchaId, fecha });
          // compute time context
          const fechaStr = fecha && fecha.split ? fecha.split('T')[0] : fecha;
          const now = new Date();
          const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
          const nowMin = now.getHours()*60 + now.getMinutes();
          // check if cancha has iluminacion
          let canchaHasIlum = false;
          try {
            const cancha = await canchasService.BuscarPorId({ id: canchaId });
            const servicios = cancha && cancha.servicios ? cancha.servicios : [];
            canchaHasIlum = servicios.some(s => (s.nombre || '').toString().toLowerCase().includes('ilumin'));
          } catch (e) {
            canchaHasIlum = false;
          }
          const opts = list.map(h => {
            const label = h.label || `${h.inicio}-${h.fin}`;
            // parse inicio
            let startMin = null;
            try {
              const parts = (h.inicio || '').toString().split(':');
              const hh = parseInt(parts[0]);
              const mm = parts.length>1?parseInt(parts[1]):0;
              if (!Number.isNaN(hh)) startMin = hh*60 + (Number.isNaN(mm)?0:mm);
            } catch (e) { startMin = null; }
            let isDisabled = !h.disponible;
            if (fechaStr === todayStr && startMin !== null && nowMin > startMin) isDisabled = true; // cannot select past start
            if (!canchaHasIlum) {
              if (startMin !== null && startMin >= 19*60) isDisabled = true; // evening requires illumination
            }
            return { value: h.id, label, isDisabled };
          });
          setHorariosOptions(opts);
          // if user already selected horarios that became unavailable for this cancha, remove them
          try {
            const selectedCsv = watchedHorariosCsv || '';
            const selectedIds = selectedCsv.toString().split(',').map(s => s.trim()).filter(s=>s).map(s => parseInt(s,10));
            const unavailable = opts.filter(o => o.isDisabled).map(o => o.value);
            const removed = selectedIds.filter(id => unavailable.includes(id));
            if (removed && removed.length > 0) {
              const remaining = selectedIds.filter(id => !unavailable.includes(id));
              setValue('horario_ids_csv', remaining.join(','));
              setHorariosDisplay((remaining.length>0)? remaining.join(',') : '');
              modalDialogService.Alert(`Se eliminaron los horarios no disponibles para la cancha seleccionada: ${removed.join(', ')}`);
            }
          } catch (e) {
            // ignore
          }
          return;
        }

        // Fallback: if Item.horarios exists, build options from it so consult view can display them
        if (Item && Array.isArray(Item.horarios) && Item.horarios.length > 0) {
          const opts = Item.horarios.map(h => ({ value: h.id ?? h.Id, label: (h.inicio && h.fin) ? `${h.inicio}-${h.fin}` : (h.id ?? h.Id).toString(), isDisabled: false }));
          // additionally mark as disabled any horarios that are earlier than now when fecha == today
          try {
            const fechaStr = (Item && Item.fecha) ? (Item.fecha.split && Item.fecha.split('T') ? Item.fecha.split('T')[0] : Item.fecha) : null;
            const now = new Date();
            const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
            if (fechaStr === todayStr) {
              opts.forEach(o => {
                try {
                  const h = Item.horarios.find(x => (x.id ?? x.Id) == o.value);
                  const fin = h?.fin || (h && h.fin);
                  if (fin) {
                    const parts = (''+fin).split(":");
                    const hh = parseInt(parts[0]);
                    const mm = parts.length>1?parseInt(parts[1]):0;
                    if (!Number.isNaN(hh)) {
                      const finMin = hh*60 + (Number.isNaN(mm)?0:mm);
                      const nowMin = now.getHours()*60 + now.getMinutes();
                      if (nowMin >= finMin) o.isDisabled = true;
                    }
                  }
                } catch (e) {}
              });
            }
          } catch (e) {}
          setHorariosOptions(opts);
          return;
        }

        setHorariosOptions([]);
      } catch (e) {
        // on error fallback to building options from Item.horarios
        if (Item && Array.isArray(Item.horarios) && Item.horarios.length > 0) {
          const opts = Item.horarios.map(h => ({ value: h.id ?? h.Id, label: (h.inicio && h.fin) ? `${h.inicio}-${h.fin}` : (h.id ?? h.Id).toString(), isDisabled: false }));
          setHorariosOptions(opts);
          return;
        }
        setHorariosOptions([]);
      }
    }
    loadDisponibles();
  }, [watchedCancha, watchedFecha, Item]);

  const onSubmit = (data) => {
    // convert horario csv to array
    if (data.horario_ids_csv) {
      const ids = data.horario_ids_csv.split(',').map(s => s.trim()).filter(s => s !== '').map(s => parseInt(s,10));
      data.horario_ids = ids;
      delete data.horario_ids_csv;
    }
    Grabar(data, Func);
  };

  // Auto-calculate precio when cancha or horarios change (precio_por_hora * cantidad de horarios)
  useEffect(() => {
    try {
      const canchaId = watch('cancha_id');
      const csv = watchedHorariosCsv || '';
      const count = csv.toString().split(',').map(s=>s.trim()).filter(s=>s).length;
      if (canchaId && Canchas && Array.isArray(Canchas)) {
        const match = Canchas.find(c => (c.id ?? c.Id)?.toString() === canchaId.toString());
        if (match) {
          const precioPorHora = parseFloat(match.precio_por_hora ?? match.precio ?? match._precio ?? 0) || 0;
          const total = Math.round((precioPorHora * (count || 0)) * 100) / 100;
          setValue('precio', total, { shouldValidate: true, shouldDirty: true });
        }
      }
    } catch (e) {
      // ignore calculation errors
    }
  }, [watch('cancha_id'), watchedHorariosCsv, Canchas, setValue]);

  

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="container-fluid">

        <fieldset disabled={AccionABMC === "C"}>

          {/* Cancha */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="cancha_id">Cancha{AccionABMC !== "C" && <span className="text-danger">*</span>}:</label>
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
              <label className="col-form-label" htmlFor="cliente_dni">Cliente{AccionABMC !== "C" && <span className="text-danger">*</span>}:</label>
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
              <label className="col-form-label" htmlFor="fecha">Fecha{AccionABMC !== "C" && <span className="text-danger">*</span>}:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              <input type="date" min={todayStr} {...register("fecha", { required: { value: true, message: "Fecha es requerida" }, validate: validateDate })} className={"form-control " + (errors?.fecha ? "is-invalid" : "") } />
              <div className="invalid-feedback">{errors?.fecha?.message}</div>
            </div>
          </div>

          {/* Horarios (ids csv) */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="horario_ids_csv">Horarios{AccionABMC !== "C" && <span className="text-danger">*</span>}:</label>
            </div>
            <div className="col-sm-8 col-md-6">
              {AccionABMC === "C" ? (
                // show the react-select control in disabled/read-only mode so it looks the same
                <Select
                  isMulti
                  isDisabled
                  options={horariosOptions}
                  classNamePrefix="react-select"
                  value={(() => {
                    // determine selected ids from Item or from computed csv
                    const selectedIds = [];
                    if (Item) {
                      if (Array.isArray(Item.horarios)) {
                        for (const h of Item.horarios) if (h && (h.id || h.Id)) selectedIds.push((h.id ?? h.Id).toString());
                      }
                      if (Item.horarios_label && Array.isArray(Item.horarios_label) && selectedIds.length === 0) {
                        // if only labels present, try to match by label
                        return horariosOptions.filter(o => Item.horarios_label.includes(o.label));
                      }
                    }
                    return horariosOptions.filter(o => selectedIds.includes(o.value?.toString()));
                  })()}
                  getOptionLabel={opt => opt.label}
                  getOptionValue={opt => opt.value}
                />
              ) : (
                <Controller
                  name="horario_ids_csv"
                  control={control}
                  render={({ field }) => (
                    <Select
                      isMulti
                      options={horariosOptions}
                      classNamePrefix="react-select"
                      value={horariosOptions.filter(o => (field.value || "").toString().split(",").map(s=>s.trim()).filter(s=>s).includes(o.value.toString()))}
                      onChange={(selected) => {
                        const ids = (selected || []).map(s => s.value);
                        field.onChange(ids.join(','));
                      }}
                      getOptionLabel={opt => opt.label}
                      getOptionValue={opt => opt.value}
                    />
                  )}
                  rules={{ required: { value: true, message: 'Horarios son requeridos' } }}
                />
              )}
              <div className="invalid-feedback">{errors?.horario_ids_csv?.message}</div>
            </div>
          </div>

          {/* Precio */}
          <div className="row">
            <div className="col-sm-4 col-md-3 offset-md-1">
              <label className="col-form-label" htmlFor="precio">Precio{AccionABMC !== "C" && <span className="text-danger">*</span>}:</label>
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
