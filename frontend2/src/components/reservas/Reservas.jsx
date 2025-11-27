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
    }, []);
  
    async function Buscar() {
      modalDialogService.BloquearPantalla(true);
      const params = {};
      if (Nombre) params.cliente_dni = Nombre;
      const data = await reservasService.Buscar(params);
      modalDialogService.BloquearPantalla(false);
      setItems(data);
    }
  
  
    async function BuscarPorId(item, accionABMC) {
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
      modalDialogService.Confirm(
        "Esta seguro que quiere " +
          (item.Activo ? "desactivar" : "activar") +
          " el registro?",
        undefined,
        undefined,
        undefined,
        async () => {
          await reservasService.Eliminar(item);
          await Buscar();
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
