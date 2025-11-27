import { NavLink } from "react-router-dom"; /* usamos NavLink para crear los links de navegacion, que aplica un estilo css cuando el link esta activo */

function Menu() {
  return (
    <nav className="navbar navbar-dark navbar-expand-md">
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          <i>Complejo Deportivo</i>
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          {/* contenido desplegable o colapsable */}
          <ul className="navbar-nav ms-auto">
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
            <li className="nav-item">
              <NavLink className="nav-link" to="/torneos">
                Torneos
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export { Menu };
