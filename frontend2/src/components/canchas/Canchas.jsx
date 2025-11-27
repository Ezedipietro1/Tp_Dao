import CanchasListado from "./CanchasListado";
import CanchasRegistro from "./CanchasRegistro";
import CanchasBuscar from "./CanchasBuscar";
import { canchasService } from "../../services/canchas.service";
import React, { useState, useEffect } from "react";
import modalDialogService from "../../services/modalDialog.service";
import moment from "moment";

function Canchas() {
    const TituloAccionABMC = {
      A: "(Agregar)",
      B: "(Eliminar)",
      M: "(Modificar)", 
      C: "(Consultar)",
      L: "(Listado)",
    };
    const [AccionABMC, setAccionABMC] = useState("L");
    const [Nombre, setNombre] = useState("");
    const [TipoCanchas, setTipoCanchas] = useState(null);
    const [Items, setItems] = useState(null);
    const [Item, setItem] = useState(null); // usado en BuscarporId (Modificar, Consultar)
    const [Func, setFunc] = useState(null); 

    // tipos de canchas no están expuestos por el backend por ahora.
    // Si deseas, podemos crear un endpoint para listar tipos (recomendado).


  
    async function Buscar(filters) {
      modalDialogService.BloquearPantalla(true);
      const params = {};
      if (Nombre) params.nombre = Nombre;
      // si se pasan filtros explícitos los usamos
      const data = await canchasService.Buscar(filters ?? params);
      modalDialogService.BloquearPantalla(false);
      setItems(data);
    }
  
  
    async function BuscarPorId(item, accionABMC) {
      const data = await canchasService.BuscarPorId(item);
      setItem(data);
      setAccionABMC(accionABMC);
    }
    
  
    function Consultar(item) {
      BuscarPorId(item, "C"); // paso la accionABMC pq es asincrono la busqueda y luego de ejecutarse quiero cambiar el estado accionABMC
    }
  
    function Modificar(item) {
      // si la cancha tiene reservas no permitimos modificarla
      if (item.has_reservas) {
        modalDialogService.Alert("No puede modificarse un registro que tiene reservas.");
        return;
      }
      BuscarPorId(item, "M"); // paso la accionABMC pq es asincrono la busqueda y luego de ejecutarse quiero cambiar el estado accionABMC
    }
  
    async function Agregar() {
      setAccionABMC("A");
      setItem({ tipo_cancha_id: '', servicio_ids: [], precio_final: 0 });
      modalDialogService.Alert("preparando el Alta...");
    }
  
    async function ActivarDesactivar(item) {
      // For canchas we use this action to delete the record. Show a clear delete confirmation.
      modalDialogService.Confirm(
        "¿Está seguro que quiere eliminar el registro?",
        "Confirmar",
        "Eliminar",
        "Cancelar",
        async () => {
          await canchasService.Eliminar(item);
          await Buscar();
        }
      );
    }
    
  
    async function Grabar(item, Func) {
      // agregar o modificar
      try
      {
        if (AccionABMC === "A") {
          Func = "A"
        } else {
          Func = "M"
        }
        await canchasService.Grabar(item, Func);
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
        Canchas <small>{TituloAccionABMC[AccionABMC]}</small>{" "}
      </div>

      {AccionABMC === "L" && (
        <CanchasBuscar
          Nombre={Nombre}
          setNombre={setNombre}
          Buscar={Buscar}
          Agregar={Agregar}
        />
      )}

      {/* Tabla de resutados de busqueda y Paginador */}
      {AccionABMC === "L" && Items?.length > 0 &&
              <CanchasListado
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
              <CanchasRegistro
              {...{ AccionABMC, Item, Grabar, Volver, Func }}
              />
            }
      </div>
      </div>
    );
  }
  export {Canchas};
