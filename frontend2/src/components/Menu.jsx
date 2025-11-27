import { NavLink } from "react-router-dom"; /* usamos NavLink para crear los links de navegacion, que aplica un estilo css cuando el link esta activo */

function Menu() {
  return (
    <nav className="navbar navbar-dark bg-dark navbar-expand-md">
      <a className="navbar-brand">
        &nbsp;<i> Complejo Deportivo </i>
      </a>
      <button
        className="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        {" "}
        {/* boton para desplegar o colapsar */}
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarSupportedContent">
        {" "}
        {/* contenido desplegable o colapsable */}
        <ul className="navbar-nav mr-auto">
          {" "}
          {/* lista de navegacion */}
          <li className="nav-item">
            <NavLink className="nav-link" to="/inicio">
              Inicio
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/canchas">
              Canchas
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/reservas">
              Reservas
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/clientes">
              Clientes
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/reportes">
              Reportes
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
export { Menu };
