/* Este archivo proporciona la interfaz html inicial */
import "./App.css";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Inicio } from "./components/Inicio";
import { Menu } from "./components/Menu";
import { ModalDialog } from "./components/ModalDialog";
import { Canchas } from "./components/canchas/Canchas";
import { Reportes } from "./components/reportes/Reportes";
import { Reservas } from "./components/reservas/Reservas";
import { Clientes } from "./components/clientes/Clientes";


function App() {
  return (
    <>
      <BrowserRouter>
        <ModalDialog />
        <Menu />
        <div className="divBody">
          <Routes>
            <Route path="/inicio" element={<Inicio />} />{" "}
            {/* en path ponemos la url y en element el componente que llamamos en esa url */}
            {/* si no encuentra la ruta en las opciones de arriba, redirige a inicio por defecto */}
            <Route path="*" element={<Navigate to="/inicio" replace />} />{" "}
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/canchas" element={<Canchas />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/reservas" element={<Reservas />} />
          </Routes>
        </div>
      </BrowserRouter>
    </>
  );
}
export default App;

/*  el componente Route se usa para definir una ruta
  el componente Navigate se usa para redirigir a otra ruta
  la opcion replace indica que la navegacion reemplaza la entrada actual, por lo que si quiero volver no me va a llevar de nuevo a la url anterior, que no coincidio con ninguna ruta 
*/

