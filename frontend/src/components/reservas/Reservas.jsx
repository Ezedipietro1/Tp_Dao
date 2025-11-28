import ReservasBuscar from "./ReservasBuscar";
import ReservasListado from "./ReservasListado";
import ReservasRegistro from "./ReservasRegistro";
import { reservasService } from "../../services/reservas.service";
import { canchasService } from "../../services/canchas.service";
import { clientesService } from "../../services/clientes.service";
import React, { useState, useEffect } from "react";
import modalDialogService from "../../services/modalDialog.service";
import moment from "moment";

function Reservas() {
    const TituloAccionABMC = {
      A: "(Agregar)",
      B: "(Eliminar)",
      M: "(Modificar)", 
      C: "(Consultar)",
      L: "(Listado)",
    };
    const [AccionABMC, setAccionABMC] = useState("L");
    const [Nombre, setNombre] = useState("");
    const [Canchas, setCanchas] = useState(null);
    const [Clientes, setClientes] = useState(null);
    const [Items, setItems] = useState(null);
    const [Item, setItem] = useState(null); // usado en BuscarporId (Modificar, Consultar)
    const [Func, setFunc] = useState(null); 

    useEffect(() => {
      async function cargarLookup() {
        try {
          const c = await canchasService.Buscar();
          setCanchas(c);
        } catch (e) {}
        try {
          const cl = await clientesService.Buscar();
          setClientes(cl);
        } catch (e) {}
      }
      cargarLookup();
      // show all reservations on initial load
      (async () => { try { await Buscar(); } catch (e) {} })();
    }, []);
  
    async function Buscar() {
      modalDialogService.BloquearPantalla(true);
      const params = {};
      if (Nombre) {
        // if Nombre looks like a DNI (all digits, length 7-8) search by dni, otherwise search by client name
        const cleaned = (Nombre || '').trim();
        if (/^\d{7,8}$/.test(cleaned)) {
          params.cliente_dni = cleaned;
        } else {
          params.cliente_nombre = cleaned;
        }
      }
      const data = await reservasService.Buscar(params);
      modalDialogService.BloquearPantalla(false);
      setItems(data);
    }

    // Update a single reserva in the local Items state to 'pagado'
    function MarcarPagado(id) {
      try {
        setItems((prev) => {
          if (!prev) return prev;
          return prev.map((it) => {
            const itId = it.id ?? it.Id;
            if (itId === id) return { ...it, estado_pago: 'pagado' };
            return it;
          });
        });
      } catch (e) {}
    }
  
  
    async function BuscarPorId(item, accionABMC) {
      // If the item passed came from the current list and already contains
      // the lookup ids (cancha_id, cliente_dni), prefer using it directly
      // because the server's GET by id may return a differently-shaped object
      // lacking those ids. This keeps the form populated correctly.
      if (item && (item.cancha_id || item.cliente_dni || item.horarios)) {
        setItem(item);
        setAccionABMC(accionABMC);
        return;
      }

      const data = await reservasService.BuscarPorId(item);
      setItem(data);
      setAccionABMC(accionABMC);
    }
    
  
    function Consultar(item) {
      BuscarPorId(item, "C"); // paso la accionABMC pq es asincrono la busqueda y luego de ejecutarse quiero cambiar el estado accionABMC
    }
  
    function Modificar(item) {
      // Reservas no tienen flag Activo; permitimos modificar
      BuscarPorId(item, "M");
    }
  
    async function Agregar() {
      setAccionABMC("A");
      setItem({ cancha_id: null, cliente_dni: '', fecha: moment(new Date()).format("YYYY-MM-DD"), horario_ids: [], precio: 0 });
      modalDialogService.Alert("preparando el Alta...");
    }
  
    async function ActivarDesactivar(item) {
      // Do not allow deleting reservations that already finished (historic)
      try {
        let isFinished = false;
        const fecha = item.fecha;
        if (fecha) {
          const resDate = new Date(fecha + 'T00:00:00');
          const today = new Date();
          const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (resDate < todayYMD) {
            isFinished = true;
          } else if (resDate.getTime() === todayYMD.getTime()) {
            const hs = item.horarios || [];
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
              if (maxEndMin > 24*60 && earliestStartMin !== null && nowMin < earliestStartMin) nowComp = nowMin + 24*60;
              if (nowComp > maxEndMin) isFinished = true;
            }
          }
        }
        if (isFinished) {
          modalDialogService.Alert('No se pueden eliminar reservas que ya finalizaron. Permanecen como histórico.');
          return;
        }
      } catch (e) {
        // ignore parsing errors and continue with confirmation
      }

      modalDialogService.Confirm(
        "¿Eliminar esta reserva? Esta acción es irreversible.",
        undefined,
        undefined,
        undefined,
        async () => {
          try {
            await reservasService.Eliminar(item);
            await Buscar();
            modalDialogService.Alert('Reserva eliminada correctamente.');
          } catch (err) {
            const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || String(err);
            modalDialogService.Alert(msg);
          }
        }
      );
    }
    
  
    async function Grabar(item, Func) {
      // agregar o modificar
      try
      {
        // backend expects POST for new reservas
        await reservasService.Grabar(item);
      }
      catch (error)
      {
        modalDialogService.Alert(error?.response?.data?.message ?? error.toString())
        return;
      }
      await Buscar();
      Volver();
    
      setTimeout(() => {
        modalDialogService.Alert(
          "Registro " +
            (AccionABMC === "A" ? "agregado" : "modificado") +
            " correctamente."
        );
      }, 0);
    }
    
  
    // Volver/Cancelar desde Agregar/Modificar/Consultar
    function Volver() {
      setAccionABMC("L");
    }
  
    return (
      <div>
      <div>
      <div className="tituloPagina">
        Reservas <small>{TituloAccionABMC[AccionABMC]}</small>{" "}
      </div>

      {AccionABMC === "L" && (
        <ReservasBuscar
          Nombre={Nombre}
          setNombre={setNombre}
          Buscar={Buscar}
          Agregar={Agregar}
        />
      )}

      {/* Tabla de resutados de busqueda y Paginador */}
      {AccionABMC === "L" && Items?.length > 0 &&
              <ReservasListado
            {...{
              Items,
              Consultar,
              Modificar,
              ActivarDesactivar,
              Buscar,
              MarcarPagado,
            }}
              />
          }
  
          {AccionABMC === "L" && Items?.length === 0 &&
              <div className="alert alert-info mensajesAlert">
                  <i className="fa fa-exclamation-sign"></i>
                  No se encontraron registros...
              </div>
          }
  
          {/* Formulario de alta/modificacion/consulta */}
            {AccionABMC !== "L" && 
              <ReservasRegistro
              {...{ AccionABMC, Item, Grabar, Volver, Canchas, Clientes, Func }}
              />
            }
      </div>
      </div>
    );
  }
  export {Reservas};
