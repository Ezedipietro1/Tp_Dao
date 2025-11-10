const API_BASE = 'http://127.0.0.1:5000';
let canchasCache = [];

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
  canchasCache = canchas;
    canchas.forEach(c => {
      const item = document.createElement('div');
      item.className = 'list-group-item';
      // safe accessors: API returns plain objects with id, nombre, precio_por_hora
      const cid = c.id ?? (c.get_id ? c.get_id() : '');
      const nombre = c.nombre ?? `Cancha ${cid}`;
      const precio = c.precio_por_hora ?? (c.get_precio ? c.get_precio() : '');
      item.textContent = `${nombre} — $${precio}`;
      listEl.appendChild(item);

      const opt = document.createElement('option');
      opt.value = cid;
      opt.textContent = nombre;
      selectEl.appendChild(opt);
    });
  } catch (err) {
    listEl.innerHTML = `<div class="text-danger">Error cargando canchas: ${err.message}</div>`;
  }
}

/**
 * Load horarios for a cancha, requiring a fecha (YYYY-MM-DD).
 * The horario select is disabled until a valid fecha >= today is selected.
 */
async function listarHorarios(canchaId, fecha) {
  const horarioSelect = document.getElementById('horario-select');
  // require fecha
  if (!fecha) {
    horarioSelect.innerHTML = '<option value="">-- seleccionar fecha primero --</option>';
    horarioSelect.disabled = true;
    computeAndShowPrice();
    return;
  }

  // validate fecha is not before today
  const today = new Date();
  const selDate = new Date(fecha + 'T00:00:00');
  if (selDate.setHours(0,0,0,0) < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
    horarioSelect.innerHTML = '<option value="">Fecha inválida (anterior al día actual)</option>';
    horarioSelect.disabled = true;
    computeAndShowPrice();
    return;
  }

  horarioSelect.innerHTML = '<option value="">-- cargando horarios --</option>';
  horarioSelect.disabled = false;
  try {
    const hs = await fetchJSON(`/canchas/${canchaId}/horarios`);
    // filter horarios by weekday of fecha (0=Sun..6=Sat)
    const wd = new Date(fecha + 'T00:00:00').getDay();
    const filtered = hs.filter(h => Number(h.dia_semana) === wd);

    horarioSelect.innerHTML = '<option value="">-- seleccionar horario --</option>';
    // determine if fecha is today to disable past slots
    const todayStr = new Date().toISOString().slice(0,10);
    const fechaIsToday = (fecha === todayStr);
    function parseToMinutes(t) {
      const parts = t.split(':').map(p => parseInt(p, 10));
      return parts[0]*60 + (parts[1]||0);
    }
    const now = new Date();
    const nowMinutes = now.getHours()*60 + now.getMinutes();

    filtered.forEach(h => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify(h);
      let label = `${h.inicio}-${h.fin}`;
      // if fecha is today, disable slots that start earlier than current time
      if (fechaIsToday) {
        const startM = parseToMinutes(h.inicio);
        if (startM < nowMinutes) {
          opt.disabled = true;
          label += ' — NO DISPONIBLE';
          opt.title = 'Horario en el pasado (no disponible)';
        }
      }
      opt.textContent = label;
      horarioSelect.appendChild(opt);
    });
    // recompute precio if needed
    computeAndShowPrice();
  } catch (err) {
    horarioSelect.innerHTML = `<option value="">Error: ${err.message}</option>`;
    horarioSelect.disabled = true;
  }
}

// NOTE: manual datetime inputs were removed; reservas must be created via fecha + horario

async function crearReserva(e) {
  e.preventDefault();
  const resultEl = document.getElementById('reserva-result');
  resultEl.innerHTML = '';
  const canchaId = parseInt(document.getElementById('cancha-select').value, 10);
  const clienteDni = document.getElementById('cliente-dni').value.trim();
  const clienteIdRaw = document.getElementById('cliente-id').value;
  const clienteId = clienteIdRaw ? parseInt(clienteIdRaw, 10) : null;
  // determine inicio/fin: if horario selected + fecha, build from that; otherwise use manual datetime inputs
  const horarioSel = document.getElementById('horario-select').value;
  let inicio = null;
  let fin = null;
  if (horarioSel) {
    const h = JSON.parse(horarioSel);
    const fecha = document.getElementById('fecha-select').value; // YYYY-MM-DD
    if (!fecha) {
      resultEl.innerHTML = '<div class="text-danger">Debés indicar la fecha para la reserva.</div>';
      return;
    }
    // validate fecha not before today
    const today = new Date();
    const selDate = new Date(fecha + 'T00:00:00');
    if (selDate.setHours(0,0,0,0) < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
      resultEl.innerHTML = '<div class="text-danger">La fecha no puede ser anterior al día de hoy.</div>';
      return;
    }
    inicio = `${fecha}T${h.inicio.length===5? h.inicio+':00' : h.inicio}`;
    fin = `${fecha}T${h.fin.length===5? h.fin+':00' : h.fin}`;
    // ensure the selected option isn't disabled (i.e., a past slot for today)
    const horarioSelectEl = document.getElementById('horario-select');
    const selOpt = horarioSelectEl.options[horarioSelectEl.selectedIndex];
    if (selOpt && selOpt.disabled) {
      resultEl.innerHTML = '<div class="text-danger">El horario seleccionado no está disponible (es anterior a la hora actual).</div>';
      return;
    }
  } else {
    resultEl.innerHTML = '<div class="text-danger">Debés seleccionar un horario.</div>';
    return;
  }
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
document.getElementById('cancha-select').addEventListener('change', (e) => {
  const v = parseInt(e.target.value, 10);
  const fecha = document.getElementById('fecha-select').value;
  if (v && fecha) listarHorarios(v, fecha);
  else {
    // require date first
    const horarioSelect = document.getElementById('horario-select');
    horarioSelect.innerHTML = '<option value="">-- seleccionar fecha primero --</option>';
    horarioSelect.disabled = true;
    document.getElementById('precio').value = '';
  }
});

// when fecha changes, validate and (if cancha selected) reload horarios
document.getElementById('fecha-select').addEventListener('change', (e) => {
  const fecha = e.target.value;
  const canchaId = parseInt(document.getElementById('cancha-select').value, 10);
  // set min attribute to today to help user (also enforced in code)
  const todayStr = new Date().toISOString().slice(0,10);
  document.getElementById('fecha-select').setAttribute('min', todayStr);
  if (canchaId && fecha) {
    listarHorarios(canchaId, fecha);
  } else {
    const horarioSelect = document.getElementById('horario-select');
    horarioSelect.innerHTML = '<option value="">-- seleccionar fecha primero --</option>';
    horarioSelect.disabled = true;
  }
});

window.addEventListener('load', () => {
  listarCanchas();
  // set fecha min to today
  const todayStr = new Date().toISOString().slice(0,10);
  const fechaEl = document.getElementById('fecha-select');
  if (fechaEl) fechaEl.setAttribute('min', todayStr);
  // disable horario until user picks a date
  const horarioSelect = document.getElementById('horario-select');
  if (horarioSelect) {
    horarioSelect.innerHTML = '<option value="">-- seleccionar fecha primero --</option>';
    horarioSelect.disabled = true;
  }
  // navigation buttons
  const show = (id) => {
    // hide all content sections
    ['main-menu','canchas-section','reserva-section','clientes-section','reservas-section'].forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.add('d-none');
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove('d-none');
  };
  document.getElementById('btn-canchas').addEventListener('click', () => { show('canchas-section'); listarCanchas(); });
  document.getElementById('btn-reservar').addEventListener('click', () => { show('reserva-section'); });
  document.getElementById('btn-clientes').addEventListener('click', () => { show('clientes-section'); listarClientes(); });
  // reservas view
  const btnReservas = document.getElementById('btn-reservas');
  if (btnReservas) btnReservas.addEventListener('click', () => { show('reservas-section'); listarReservas(); });
  // back buttons inside sections
  document.querySelectorAll('.btn-back').forEach(b => b.addEventListener('click', () => show('main-menu')));
  // initial view: main menu
  show('main-menu');
});

async function listarClientes() {
  const listEl = document.getElementById('clientes-list');
  listEl.innerHTML = 'Cargando...';
  try {
    const clientes = await fetchJSON('/clientes');
    listEl.innerHTML = '';
    clientes.forEach(c => {
      const item = document.createElement('div');
      item.className = 'list-group-item';
      item.textContent = `${c.id} — ${c.nombre || ''} ${c.apellido || ''} — DNI: ${c.dni || ''}`;
      listEl.appendChild(item);
    });
  } catch (err) {
    listEl.innerHTML = `<div class="text-danger">Error cargando clientes: ${err.message}</div>`;
  }
}

async function listarReservas() {
  const listEl = document.getElementById('reservas-list');
  listEl.innerHTML = 'Cargando...';
  try {
    const reservas = await fetchJSON('/reservas');
    listEl.innerHTML = '';
    reservas.forEach(r => {
      const item = document.createElement('div');
      item.className = 'list-group-item';
      const inicio = r.inicio ? r.inicio.replace('T', ' ') : '';
      const fin = r.fin ? r.fin.replace('T', ' ') : '';
      item.textContent = `#${r.id} — ${r.cancha_nombre || ('Cancha ' + (r.cancha_id||''))} — ${r.cliente_nombre||''} (${r.cliente_dni||''}) — ${inicio} - ${fin} — $${r.precio}`;
      listEl.appendChild(item);
    });
  } catch (err) {
    listEl.innerHTML = `<div class="text-danger">Error cargando reservas: ${err.message}</div>`;
  }
}

// manual datetime inputs removed; no visibility toggling needed

function computeAndShowPrice() {
  try {
    const canchaId = parseInt(document.getElementById('cancha-select').value, 10);
    const horarioSel = document.getElementById('horario-select').value;
    const precioEl = document.getElementById('precio');
    if (!canchaId || !horarioSel) {
      if (precioEl) precioEl.value = '';
      return;
    }
    const h = JSON.parse(horarioSel);
    const cancha = canchasCache.find(c => (c.id ?? (c.get_id ? c.get_id() : null)) == canchaId);
    const precioHora = cancha ? (cancha.precio_por_hora ?? (cancha.get_precio ? cancha.get_precio() : 0)) : 0;
    // parse times 'HH:MM' or 'HH:MM:SS'
    function parseToMinutes(t) {
      const parts = t.split(':').map(p => parseInt(p, 10));
      return parts[0]*60 + (parts[1]||0);
    }
    const startM = parseToMinutes(h.inicio);
    const endM = parseToMinutes(h.fin);
    let diff = endM - startM;
    if (diff <= 0) diff += 24*60; // handle wrap-around
    const hours = diff/60;
    const total = Math.round((hours * precioHora + Number.EPSILON) * 100) / 100;
    if (precioEl) precioEl.value = total.toFixed(2);
  } catch (e) {
    // ignore
  }
}

document.getElementById('horario-select').addEventListener('change', computeAndShowPrice);
