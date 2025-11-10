const API_BASE = 'http://127.0.0.1:5000';

async function fetchJSON(path, opts) {
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

async function listarCanchas() {
  const listEl = document.getElementById('canchas-list');
  const selectEl = document.getElementById('cancha-select');
  listEl.innerHTML = 'Cargando...';
  try {
    const canchas = await fetchJSON('/canchas');
    listEl.innerHTML = '';
    selectEl.innerHTML = '';
    canchas.forEach(c => {
      const item = document.createElement('div');
      item.className = 'list-group-item';
      item.textContent = `${c.nombre || 'Cancha ' + c.get_id ? c.get_id : ''} — $${c.precio_por_hora || c.get_precio ? c.get_precio : ''}`;
      listEl.appendChild(item);

      const opt = document.createElement('option');
      opt.value = c.id || c.get_id();
      opt.textContent = c.nombre || `Cancha ${opt.value}`;
      selectEl.appendChild(opt);
    });
  } catch (err) {
    listEl.innerHTML = `<div class="text-danger">Error cargando canchas: ${err.message}</div>`;
  }
}

function isoLocalStringFromInput(inputEl) {
  // datetime-local value -> 'YYYY-MM-DDTHH:MM:SS'
  const v = inputEl.value; // e.g. '2025-11-10T18:00'
  if (!v) return null;
  // append seconds if missing
  if (v.length === 16) return v + ':00';
  return v;
}

async function crearReserva(e) {
  e.preventDefault();
  const resultEl = document.getElementById('reserva-result');
  resultEl.innerHTML = '';
  const canchaId = parseInt(document.getElementById('cancha-select').value, 10);
  const clienteDni = document.getElementById('cliente-dni').value.trim();
  const clienteIdRaw = document.getElementById('cliente-id').value;
  const clienteId = clienteIdRaw ? parseInt(clienteIdRaw, 10) : null;
  const inicio = isoLocalStringFromInput(document.getElementById('inicio'));
  const fin = isoLocalStringFromInput(document.getElementById('fin'));
  const precio = parseFloat(document.getElementById('precio').value);

  if (!canchaId || (!clienteId && !clienteDni) || !inicio || !fin || isNaN(precio)) {
    resultEl.innerHTML = '<div class="text-danger">Completar todos los campos requeridos.</div>';
    return;
  }

  const payload = { cancha_id: canchaId, inicio, fin, precio };
  if (clienteDni && !clienteId) payload.cliente_dni = clienteDni;
  else payload.cliente_id = clienteId;

  try {
    const data = await fetchJSON('/reservas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    resultEl.innerHTML = `<div class="text-success">Reserva creada. ID: ${data.reserva_id}</div>`;
  } catch (err) {
    resultEl.innerHTML = `<div class="text-danger">Error: ${err.message}</div>`;
  }
}

document.getElementById('reserva-form').addEventListener('submit', crearReserva);
window.addEventListener('load', listarCanchas);
