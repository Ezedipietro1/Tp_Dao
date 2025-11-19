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
      item.className = 'list-group-item d-flex justify-content-between align-items-center';
      const cid = c.id ?? (c.get_id ? c.get_id() : '');
      const nombre = c.nombre ?? `Cancha ${cid}`;
      const precio = c.precio_por_hora ?? (c.get_precio ? c.get_precio() : '');
      const left = document.createElement('div');
      left.textContent = `${nombre} — $${precio}`;
      const actions = document.createElement('div');
      actions.className = 'btn-group';
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-sm btn-outline-primary';
      btnEdit.textContent = 'Editar';
      btnEdit.addEventListener('click', () => showEditCancha(cid));
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-outline-danger';
      btnDelete.textContent = 'Eliminar';
      btnDelete.addEventListener('click', () => eliminarCancha(cid));
      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);
      item.appendChild(left);
      item.appendChild(actions);
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

// --- Canchas CRUD UI handlers ---
function resetCanchaForm() {
  document.getElementById('cancha-id').value = '';
  const tipoSel = document.getElementById('cancha-tipo');
  if (tipoSel) tipoSel.value = '';
  const svc = document.getElementById('cancha-servicios');
  if (svc) {
    Array.from(svc.options).forEach(o => o.selected = false);
  }
}

async function showCreateCancha() {
  document.getElementById('cancha-form-title').textContent = 'Crear cancha';
  resetCanchaForm();
  // show the form immediately so UI is responsive; load selects in background
  const container = document.getElementById('cancha-form-container');
  if (container) container.classList.remove('d-none');
  try {
    // load services and tipos concurrently; failures shouldn't block the form
    await Promise.allSettled([awaitLoadServicesForForm(), awaitLoadTiposForForm()]);
  } catch (err) {
    console.error('Error cargando datos del formulario de cancha:', err);
  }
}

async function showEditCancha(canchaId) {
  // fetch cancha details from API (includes servicios)
  let cancha;
  try {
    cancha = await fetchJSON(`/canchas/${canchaId}`);
  } catch (err) {
    alert('Error cargando cancha: ' + err.message);
    return;
  }
  document.getElementById('cancha-form-title').textContent = 'Editar cancha ' + canchaId;
  document.getElementById('cancha-id').value = canchaId;
  // load tipos and services into form and mark selected ones
  awaitLoadTiposForForm(cancha.tipo_cancha_id || null);
  awaitLoadServicesForForm(cancha.servicios || []);
  document.getElementById('cancha-form-container').classList.remove('d-none');
}

async function crearActualizarCancha(e) {
  e.preventDefault();
  const idVal = document.getElementById('cancha-id').value;
  const tipo = parseInt(document.getElementById('cancha-tipo').value, 10);
  if (!tipo) {
    alert('Tipo de cancha es requerido');
    return;
  }
  const svcSel = document.getElementById('cancha-servicios');
  const servicio_ids = svcSel ? Array.from(svcSel.selectedOptions).filter(o => o.value).map(o => parseInt(o.value, 10)) : [];
  const payload = { tipo_cancha_id: tipo, servicio_ids };
  try {
    if (idVal) {
      await fetchJSON(`/canchas/${idVal}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetchJSON('/canchas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    document.getElementById('cancha-form-container').classList.add('d-none');
    listarCanchas();
  } catch (err) {
    alert('Error guardando cancha: ' + err.message);
  }
}


// Load servicios into the cancha form. If `selected` provided, mark those ids selected.
async function awaitLoadServicesForForm(selected = []) {
  const svcEl = document.getElementById('cancha-servicios');
  if (!svcEl) return;
  try {
    const servicios = await fetchJSON('/servicios');
    svcEl.innerHTML = '';
    servicios.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.nombre} — $${s.precio}`;
      if (selected.find(sel => sel.id == s.id)) opt.selected = true;
      svcEl.appendChild(opt);
    });
  } catch (err) {
    svcEl.innerHTML = '<option value="">Error cargando servicios</option>';
  }
}

async function awaitLoadTiposForForm(selectedTipoId = null) {
  const sel = document.getElementById('cancha-tipo');
  if (!sel) return;
  try {
    const tipos = await fetchJSON('/tipos_cancha');
    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Seleccione tipo --';
    sel.appendChild(placeholder);
    tipos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.nombre} — $${t.precio}`;
      if (selectedTipoId && t.id == selectedTipoId) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('Error cargando tipos:', err);
  }
}

async function eliminarCancha(canchaId) {
  if (!confirm('Eliminar cancha #' + canchaId + '? Esta acción borra reservas asociadas.')) return;
  try {
    await fetchJSON(`/canchas/${canchaId}`, { method: 'DELETE' });
    listarCanchas();
  } catch (err) {
    alert('Error eliminando cancha: ' + err.message);
  }
}

async function aplicarFiltroCanchas() {
  const tipo = document.getElementById('filter-tipo').value;
  const minp = document.getElementById('filter-min-precio').value;
  const maxp = document.getElementById('filter-max-precio').value;
  const params = new URLSearchParams();
  if (tipo) params.append('tipo_cancha_id', tipo);
  if (minp) params.append('min_precio', minp);
  if (maxp) params.append('max_precio', maxp);
  const listEl = document.getElementById('canchas-list');
  listEl.innerHTML = 'Cargando...';
  try {
    const canchas = await fetchJSON('/canchas?' + params.toString());
    // reuse listarCanchas rendering by temporarily overriding canchasCache usage
    canchasCache = canchas;
    listarCanchas();
  } catch (err) {
    listEl.innerHTML = `<div class="text-danger">Error al buscar canchas: ${err.message}</div>`;
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
  const hs = await fetchJSON(`/horarios`);
    // horarios are global (no dia_semana). Show all and let the user select one or more.
    horarioSelect.innerHTML = '';
    // make the select allow multiple choices for multi-slot reservations
    horarioSelect.multiple = true;
    horarioSelect.size = Math.min(8, hs.length || 8);
    horarioSelect.innerHTML = '<option value="" disabled>-- seleccionar uno o más horarios (Ctrl/Cmd+click) --</option>';
    // determine if fecha is today to disable past slots
    const todayStr = new Date().toISOString().slice(0,10);
    const fechaIsToday = (fecha === todayStr);
    function parseToMinutes(t) {
      const parts = t.split(':').map(p => parseInt(p, 10));
      return parts[0]*60 + (parts[1]||0);
    }
    const now = new Date();
    const nowMinutes = now.getHours()*60 + now.getMinutes();

    hs.forEach(h => {
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
  // determine inicio/fin: if horario selected + fecha, build from that; otherwise use manual datetime inputs
  // collect one or more selected horarios
  const horarioSelectEl = document.getElementById('horario-select');
  const selectedOptions = Array.from(horarioSelectEl.selectedOptions).filter(o => o.value);
  if (selectedOptions.length === 0) {
    resultEl.innerHTML = '<div class="text-danger">Debés seleccionar al menos un horario.</div>';
    return;
  }
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
  // ensure none of the selected options is disabled
  for (const opt of selectedOptions) {
    if (opt.disabled) {
      resultEl.innerHTML = '<div class="text-danger">Algunos horarios seleccionados no están disponibles (son anteriores a la hora actual).</div>';
      return;
    }
  }
  const horario_objs = selectedOptions.map(o => JSON.parse(o.value));
  const horario_ids = horario_objs.map(h => h.id);
  const precio = parseFloat(document.getElementById('precio').value);

  if (!canchaId || !clienteDni || !fecha || horario_ids.length === 0 || isNaN(precio)) {
    resultEl.innerHTML = '<div class="text-danger">Completar todos los campos requeridos.</div>';
    return;
  }

  const payload = { cancha_id: canchaId, fecha: fecha, horario_ids: horario_ids, precio };
  payload.cliente_dni = clienteDni;

  try {
    const data = await fetchJSON('/reservas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    resultEl.innerHTML = `<div class="text-success">Reserva creada. ID: ${data.reserva_id}</div>`;
  } catch (err) {
    // try to extract server message
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
  // canchas UI hooks
  const btnCrear = document.getElementById('btn-crear-cancha');
  if (btnCrear) btnCrear.addEventListener('click', async () => {
    console.log('btn-crear-cancha clicked');
    show('canchas-section');
    try {
      await showCreateCancha();
    } catch (err) {
      console.error('Error en showCreateCancha():', err);
      // ensure form is visible even on error
      const container = document.getElementById('cancha-form-container');
      if (container) container.classList.remove('d-none');
    }
  });
  const btnFiltrar = document.getElementById('btn-filtrar-canchas');
  if (btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltroCanchas);
  const canchaForm = document.getElementById('cancha-form');
  if (canchaForm) canchaForm.addEventListener('submit', crearActualizarCancha);
  const canchaCancel = document.getElementById('cancha-cancel');
  if (canchaCancel) canchaCancel.addEventListener('click', () => document.getElementById('cancha-form-container').classList.add('d-none'));
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
      item.textContent = `${c.dni} — ${c.nombre || ''} ${c.apellido || ''}`;
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
      const fecha = r.fecha || '';
      const horariosLabel = (r.horarios_label && Array.isArray(r.horarios_label)) ? r.horarios_label.join(', ') : (r.horarios && Array.isArray(r.horarios) ? r.horarios.map(h => `${h.inicio}-${h.fin}`).join(', ') : '');
      item.textContent = `#${r.id} — ${r.cancha_nombre || ('Cancha ' + (r.cancha_id||''))} — ${r.cliente_nombre||''} (${r.cliente_dni||''}) — ${fecha} — ${horariosLabel} — $${r.precio}`;
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
    const horarioSelect = document.getElementById('horario-select');
    const precioEl = document.getElementById('precio');
    if (!canchaId || !horarioSelect) {
      if (precioEl) precioEl.value = '';
      return;
    }
    const selectedOptions = Array.from(horarioSelect.selectedOptions).filter(o => o.value && !o.disabled);
    if (selectedOptions.length === 0) {
      if (precioEl) precioEl.value = '';
      return;
    }
    const cancha = canchasCache.find(c => (c.id ?? (c.get_id ? c.get_id() : null)) == canchaId);
    const precioHora = cancha ? (cancha.precio_por_hora ?? (cancha.get_precio ? cancha.get_precio() : 0)) : 0;
    function parseToMinutes(t) {
      const parts = String(t).split(':').map(p => parseInt(p, 10));
      return parts[0]*60 + (parts[1]||0);
    }
    let totalHours = 0;
    selectedOptions.forEach(opt => {
      try {
        const h = JSON.parse(opt.value);
        const startM = parseToMinutes(h.inicio);
        const endM = parseToMinutes(h.fin);
        let diff = endM - startM;
        if (diff <= 0) diff += 24*60;
        totalHours += diff/60;
      } catch (e) {
        // ignore malformed option
      }
    });
    const total = Math.round((totalHours * precioHora + Number.EPSILON) * 100) / 100;
    if (precioEl) precioEl.value = total.toFixed(2);
  } catch (e) {
    // ignore
  }
}

document.getElementById('horario-select').addEventListener('change', computeAndShowPrice);
