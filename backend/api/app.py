from flask import Flask, jsonify, request

try:
    from flask_cors import CORS
except Exception:
    CORS = None
import os, sys
# ensure project root and current api folder are on sys.path so imports like `import repositorio` and `routes` work
# add project root (two levels up) so `repositorio` can be imported when this file lives in `backend/api`
proj_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, proj_root)
# also add the current folder so `routes` (placed next to this file) can be imported as a package
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
# add the folder that contains `repositorio.py` (proyecto tiene `backend/repository/repositorio.py`)
repo_module_dir = os.path.abspath(os.path.join(proj_root, 'backend', 'repository'))
if os.path.isdir(repo_module_dir):
    sys.path.insert(0, repo_module_dir)
# add backend folder so packages like `db` (ubicado en backend/db) sean importables como top-level `db`
backend_dir = os.path.abspath(os.path.join(proj_root, 'backend'))
if os.path.isdir(backend_dir):
    sys.path.insert(0, backend_dir)

# ahora que estamos ejecutando como paquete, use imports relativos para los módulos del paquete
from ..repository import repositorio


app = Flask(__name__)
if CORS:
    CORS(app)
else:
    # fallback: ensure minimal CORS headers even when flask_cors isn't installed
    @app.after_request
    def _add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
# Registrar blueprints desde el subpaquete `routes`
from ..routes.canchas import canchas_bp
from ..routes.clientes import clientes_bp
from ..routes.reservas import reservas_bp
from ..routes.pagos import pagos_bp
from ..routes.reportes import reportes_bp
from ..routes.torneos import torneos_bp

# Registrar blueprint de canchas (separación de rutas)
app.register_blueprint(canchas_bp)

# Registrar blueprints adicionales
app.register_blueprint(clientes_bp)
app.register_blueprint(reservas_bp)
app.register_blueprint(pagos_bp)
app.register_blueprint(reportes_bp)
app.register_blueprint(torneos_bp)



if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
