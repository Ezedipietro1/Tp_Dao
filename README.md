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

python .\db\init_db.py

Ejecutar la API local:

```powershell
python -m TP_Canchas.api.app
```

Uso rápido
---------
- GET /canchas -> lista canchas
- GET /canchas/<id>/disponibilidad?inicio=YYYY-MM-DDTHH:MM:SS&fin=... -> chequear disponibilidad
- POST /reservas -> crear reserva (JSON con cancha_id, cliente_dni, inicio, fin, precio)
- POST /reservas/<id>/cancel -> cancelar reserva
- POST /pagos -> registrar pago (JSON con reserva_id, metodo_pago_id, monto)

Notas
-----
- Usamos SQLite por simplicidad local; para producción cambiar a Postgres/MySQL.
- Los scripts `db/schema.sql` y `db/seed.sql` están en la carpeta `db/`.

Cambios recientes: soporte de DNI
-------------------------------
- La tabla `cliente` ahora incluye la columna `dni` y la lógica de repositorio prioriza `dni` como identificador del cliente.
- Si tienes una base existente, realiza la migración manualmente: añade la columna `dni` a la tabla `cliente` y actualiza los valores para cada fila, o recrea la base usando `db/schema.sql` y `db/seed.sql`.

Después de esto, las APIs que devuelven reservas incluirán `cliente_dni` y podés crear reservas enviando `cliente_dni` en el body de la petición.


.\TP_Canchas\.venv\Scripts\python.exe -m TP_Canchas.api.app