clFrontend mínimo para TP_Canchas

Opciones para desarrollo local:

1) Usar servidor estático (rápido)
- Asegurate de tener la API corriendo en http://127.0.0.1:5000
- Desde la carpeta del proyecto:

```powershell
python -m http.server 8000 -d frontend
# luego abrir http://127.0.0.1:8000/index.html
```

2) Servir los archivos desde Flask (misma origin)
- Copiar manualmente los archivos de `frontend/` a `api/static/` y luego ejecutar la API:

```powershell
python -m TP_Canchas.api.app
# abrir http://127.0.0.1:5000/static/index.html o ajustar rutas
```

Notas:
- La API debe permitir CORS para que el frontend estático (puerto 8000) pueda llamar a la API en 5000. Hemos agregado soporte a CORS en `api/app.py` y `requirements.txt`.
- Si necesitás un SPA con React/Angular/Vue más adelante, puedo generar el scaffold y las instrucciones.
