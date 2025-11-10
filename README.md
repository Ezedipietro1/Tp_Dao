TP_Canchas - Instrucciones rápidas

Objetivo
--------
Proyecto para gestionar canchas, reservas y pagos usando SQLite y una API ligera (Flask).

Requisitos
---------
- Python 3.8+
- (Opcional) Docker si desea levantar otros servicios.

Instalación rápida
------------------
PowerShell (Windows):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crear la base de datos y cargar esquema y datos de ejemplo:

```powershell
# Desde la carpeta TP_Canchas
python -c "from TP_Canchas.db.connection import run_script; run_script('db/schema.sql'); run_script('db/seed.sql')"
```

Ejecutar la API local:

```powershell
python -m TP_Canchas.api.app
```

Uso rápido
---------
- GET /canchas -> lista canchas
- GET /canchas/<id>/disponibilidad?inicio=YYYY-MM-DDTHH:MM:SS&fin=... -> chequear disponibilidad
- POST /reservas -> crear reserva (JSON con cancha_id, cliente_id, inicio, fin, precio)
- POST /reservas/<id>/cancel -> cancelar reserva
- POST /pagos -> registrar pago (JSON con reserva_id, metodo_pago_id, monto)

Notas
-----
- Usamos SQLite por simplicidad local; para producción cambiar a Postgres/MySQL.
- Los scripts `db/schema.sql` y `db/seed.sql` están en la carpeta `db/`.

Cambios recientes: soporte de DNI
-------------------------------
- La tabla `cliente` ahora incluye la columna `dni` y la lógica de repositorio prioriza `dni` como identificador del cliente.
- Si tienes una base existente, ejecuta la migración para añadir la columna `dni` y poblar valores por defecto:

```powershell
python TP_Canchas/db/migrate_add_dni.py
```

- Esto añadirá valores por defecto tipo `DNI000001` para clientes existentes. Actualiza los DNIs reales manualmente usando SQLite o con el script `TP_Canchas/db/update_cliente_dni.py` que viene en el repositorio (ejemplo abajo).

Actualizar DNI de un cliente (ejemplo):

```powershell
python TP_Canchas/db/update_cliente_dni.py 1 12345678
```

Después de esto, las APIs que devuelven reservas incluirán `cliente_dni` y podés crear reservas usando `crear_reserva_por_dni` desde el repositorio o enviando `cliente_id` tradicionalmente.
