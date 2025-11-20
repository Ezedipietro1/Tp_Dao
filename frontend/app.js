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
  // reset custom multiselect (checkboxes) and button label
  const menu = document.getElementById('cancha-servicios-menu');
  if (menu) {
    Array.from(menu.querySelectorAll('input[type=checkbox]')).forEach(cb => cb.checked = false);
  }
  const btn = document.getElementById('cancha-servicios-button');
  if (btn) btn.textContent = 'Seleccionar servicios';
}

function openCanchaModal() {
  const modal = document.getElementById('cancha-modal');
  if (modal) modal.classList.remove('d-none');
}

function closeCanchaModal() {
  const modal = document.getElementById('cancha-modal');
  if (modal) modal.classList.add('d-none');
  // reset form for next use
  try { resetCanchaForm(); } catch (e) { /* ignore */ }
}

async function showCreateCancha() {
  document.getElementById('cancha-form-title').textContent = 'Crear cancha';
  resetCanchaForm();
  // show the form immediately so UI is responsive; load selects in background
  openCanchaModal();
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
  openCanchaModal();
}

async function crearActualizarCancha(e) {
  e.preventDefault();
  const idVal = document.getElementById('cancha-id').value;
  const tipo = parseInt(document.getElementById('cancha-tipo').value, 10);
  if (!tipo) {
    alert('Tipo de cancha es requerido');
    return;
  }
  // collect selected servicio ids from multiselect menu
  const menu = document.getElementById('cancha-servicios-menu');
  let servicio_ids = [];
  if (menu) {
    servicio_ids = Array.from(menu.querySelectorAll('input[type=checkbox]:checked')).map(cb => parseInt(cb.getAttribute('data-id'), 10));
  }
  const payload = { tipo_cancha_id: tipo, servicio_ids };
  try {
    if (idVal) {
      await fetchJSON(`/canchas/${idVal}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetchJSON('/canchas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    closeCanchaModal();
    listarCanchas();
  } catch (err) {
    alert('Error guardando cancha: ' + err.message);
  }
}


// Load servicios into the cancha form. If `selected` provided, mark those ids selected.
async function awaitLoadServicesForForm(selected = []) {
  const menu = document.getElementById('cancha-servicios-menu');
  const btn = document.getElementById('cancha-servicios-button');
  if (!menu || !btn) return;
  try {
    const servicios = await fetchJSON('/servicios');
    menu.innerHTML = '';
    // normalize selected ids array
    let selectedIds = new Set();
    try {
      if (Array.isArray(selected) && selected.length > 0) {
        // selected may be array of objects {id,...} or ids
        selected.forEach(s => {
          if (s && typeof s === 'object' && 'id' in s) selectedIds.add(Number(s.id));
          else selectedIds.add(Number(s));
        });
      }
    } catch (e) { /* ignore */ }

    servicios.forEach(s => {
      const id = s.id;
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.setAttribute('data-id', id);
      cb.value = id;
      if (selectedIds.has(Number(id))) cb.checked = true;
      cb.addEventListener('change', () => updateServiciosButtonLabel());
      label.appendChild(cb);
      const span = document.createElement('span');
      span.textContent = ` ${s.nombre} — $${s.precio}`;
      label.appendChild(span);
      menu.appendChild(label);
    });

    // update button label to show selected count/names
    updateServiciosButtonLabel();
  } catch (err) {
    menu.innerHTML = '<div class="text-danger">Error cargando servicios</div>';
  }
}

function updateServiciosButtonLabel() {
  const menu = document.getElementById('cancha-servicios-menu');
  const btn = document.getElementById('cancha-servicios-button');
  if (!menu || !btn) return;
  const checked = Array.from(menu.querySelectorAll('input[type=checkbox]:checked'));
  if (checked.length === 0) {
    btn.textContent = 'Seleccionar servicios';
  } else if (checked.length === 1) {
    const label = checked[0].nextSibling ? checked[0].nextSibling.textContent.trim() : '1 seleccionado';
    btn.textContent = label;
  } else {
    btn.textContent = `${checked.length} servicios seleccionados`;
  }
}

// toggle menu open/close
function toggleServiciosMenu() {
  const menu = document.getElementById('cancha-servicios-menu');
  if (!menu) return;
  menu.classList.toggle('d-none');
}

// close servicios menu
function closeServiciosMenu() {
  const menu = document.getElementById('cancha-servicios-menu');
  if (!menu) return;
  menu.classList.add('d-none');
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
  // show our custom confirm modal
  showDeleteCanchaModal(canchaId);
}

let pendingDeleteCanchaId = null;

function showDeleteCanchaModal(canchaId, canchaNombre) {
  pendingDeleteCanchaId = canchaId;
  const modal = document.getElementById('delete-cancha-modal');
  const msg = document.getElementById('delete-cancha-message');
  if (msg) {
    const namePart = canchaNombre ? ` ${canchaNombre}` : '';
    msg.textContent = `Eliminar cancha #${canchaId}? Esta acción borrará las reservas asociadas.`;
  }
  if (modal) modal.classList.remove('d-none');
}

function closeDeleteCanchaModal() {
  pendingDeleteCanchaId = null;
  const modal = document.getElementById('delete-cancha-modal');
  if (modal) modal.classList.add('d-none');
}

async function confirmDeleteCancha() {
  if (!pendingDeleteCanchaId) return closeDeleteCanchaModal();
  try {
    await fetchJSON(`/canchas/${pendingDeleteCanchaId}`, { method: 'DELETE' });
    closeDeleteCanchaModal();
    listarCanchas();
  } catch (err) {
    closeDeleteCanchaModal();
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
// The form submit is handled by crearActualizarReserva (supports create and edit).
document.getElementById('reserva-form').addEventListener('submit', crearActualizarReserva);
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
  // delete-confirm modal handlers
  const delConfirm = document.getElementById('delete-cancha-confirm');
  const delCancel = document.getElementById('delete-cancha-cancel');
  const delClose = document.getElementById('delete-cancha-modal-close');
  if (delConfirm) delConfirm.addEventListener('click', () => confirmDeleteCancha());
  if (delCancel) delCancel.addEventListener('click', () => closeDeleteCanchaModal());
  if (delClose) delClose.addEventListener('click', () => closeDeleteCanchaModal());
  // delete-reserva modal handlers
  const delResConfirm = document.getElementById('delete-reserva-confirm');
  const delResCancel = document.getElementById('delete-reserva-cancel');
  const delResClose = document.getElementById('delete-reserva-modal-close');
  if (delResConfirm) delResConfirm.addEventListener('click', () => confirmDeleteReserva());
  if (delResCancel) delResCancel.addEventListener('click', () => closeDeleteReservaModal());
  if (delResClose) delResClose.addEventListener('click', () => closeDeleteReservaModal());
  // reserva modal handlers (close/cancel)
  const reservaClose = document.getElementById('reserva-modal-close');
  const reservaBackdrop = document.getElementById('reserva-modal-backdrop');
  const reservaCancel = document.getElementById('reserva-cancel');
  if (reservaClose) reservaClose.addEventListener('click', () => closeReservaModal());
  if (reservaCancel) reservaCancel.addEventListener('click', () => closeReservaModal());
  if (reservaBackdrop) reservaBackdrop.addEventListener('click', () => closeReservaModal());
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
  const btnCrearReserva = document.getElementById('btn-crear-reserva');
  if (btnCrearReserva) btnCrearReserva.addEventListener('click', () => {
    // open reservation modal for creating a new reserva
    document.getElementById('reserva-form-title').textContent = 'Crear reserva';
    openReservaModal();
    try { document.getElementById('reserva-form').reset(); } catch (e) {}
    editingReservaId = null;
    const horarioSelect = document.getElementById('horario-select');
    if (horarioSelect) { horarioSelect.innerHTML = '<option value="">-- seleccionar horario --</option>'; horarioSelect.disabled = true; }
    // load clients list into the select
    try { populateClientesSelect(); } catch (e) { console.error('Error cargando clientes para crear reserva', e); }
  });
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
      // ensure modal is visible even on error
      openCanchaModal();
    }
  });
  const btnFiltrar = document.getElementById('btn-filtrar-canchas');
  if (btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltroCanchas);
  const canchaForm = document.getElementById('cancha-form');
  if (canchaForm) canchaForm.addEventListener('submit', crearActualizarCancha);
  const canchaCancel = document.getElementById('cancha-cancel');
  if (canchaCancel) canchaCancel.addEventListener('click', () => closeCanchaModal());
  // clientes UI hooks
  const btnCrearCliente = document.getElementById('btn-crear-cliente');
  if (btnCrearCliente) btnCrearCliente.addEventListener('click', async () => { show('clientes-section'); try { await showCreateCliente(); } catch (e) { openClienteModal(); } });
  const clienteForm = document.getElementById('cliente-form');
  if (clienteForm) clienteForm.addEventListener('submit', crearActualizarCliente);
  const clienteCancel = document.getElementById('cliente-cancel');
  if (clienteCancel) clienteCancel.addEventListener('click', () => closeClienteModal());
  const clienteClose = document.getElementById('cliente-modal-close');
  if (clienteClose) clienteClose.addEventListener('click', () => closeClienteModal());
  // delete cliente modal handlers
  const delCliConfirm = document.getElementById('delete-cliente-confirm');
  const delCliCancel = document.getElementById('delete-cliente-cancel');
  const delCliClose = document.getElementById('delete-cliente-modal-close');
  if (delCliConfirm) delCliConfirm.addEventListener('click', () => confirmDeleteCliente());
  if (delCliCancel) delCliCancel.addEventListener('click', () => closeDeleteClienteModal());
  if (delCliClose) delCliClose.addEventListener('click', () => closeDeleteClienteModal());
  // wire delete-reserva backdrop as well
  const delResModal = document.getElementById('delete-reserva-modal');
  if (delResModal) {
    const delResBackdrop = delResModal.querySelector('.modal-backdrop');
    if (delResBackdrop) delResBackdrop.addEventListener('click', () => closeDeleteReservaModal());
  }
  // reservas view
  const btnReservas = document.getElementById('btn-reservas');
  if (btnReservas) btnReservas.addEventListener('click', () => { show('reservas-section'); listarReservas(); });
  // back buttons inside sections
  document.querySelectorAll('.btn-back').forEach(b => b.addEventListener('click', () => show('main-menu')));
  // initial view: main menu
  show('main-menu');
  // Event delegation fallback for reservas list (handles Edit/Delete clicks reliably)
  const reservasList = document.getElementById('reservas-list');
  if (reservasList) {
    reservasList.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn || !reservasList.contains(btn)) return;
      // try data attributes first
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (action === 'edit' && id) {
        try { showEditReserva(Number(id)); } catch (e) { console.error(e); }
      } else if (action === 'delete' && id) {
        try { eliminarReserva(Number(id)); } catch (e) { console.error(e); }
      }
    });
  }
});

// Global click handler to close reserva modal when clicking backdrop or close
document.addEventListener('click', (e) => {
  const resModal = document.getElementById('reserva-modal');
  if (resModal && !resModal.classList.contains('d-none')) {
    const backdrop = document.getElementById('reserva-modal-backdrop');
    const closeBtn = document.getElementById('reserva-modal-close');
    if (e.target === backdrop || e.target === closeBtn) {
      closeReservaModal();
      return;
    }
  }
});

// handlers para cerrar modal por backdrop o boton
document.addEventListener('click', (e) => {
  // cancha modal
  const modal = document.getElementById('cancha-modal');
  if (modal && !modal.classList.contains('d-none')) {
    const backdrop = document.getElementById('cancha-modal-backdrop');
    const closeBtn = document.getElementById('cancha-modal-close');
    if (e.target === backdrop || e.target === closeBtn) {
      closeCanchaModal();
      return;
    }
  }

  // delete cancha modal
  const delModal = document.getElementById('delete-cancha-modal');
  if (delModal && !delModal.classList.contains('d-none')) {
    const delBackdrop = delModal.querySelector('.modal-backdrop');
    const delCloseBtn = document.getElementById('delete-cancha-modal-close');
    if (e.target === delBackdrop || e.target === delCloseBtn) {
      closeDeleteCanchaModal();
      return;
    }
  }

  // cliente modal
  const cliModal = document.getElementById('cliente-modal');
  if (cliModal && !cliModal.classList.contains('d-none')) {
    const cliBackdrop = document.getElementById('cliente-modal-backdrop');
    const cliCloseBtn = document.getElementById('cliente-modal-close');
    if (e.target === cliBackdrop || e.target === cliCloseBtn) {
      closeClienteModal();
      return;
    }
  }

  // delete cliente modal
  const delCliModal = document.getElementById('delete-cliente-modal');
  if (delCliModal && !delCliModal.classList.contains('d-none')) {
    const delCliBackdrop = delCliModal.querySelector('.modal-backdrop');
    const delCliCloseBtn = document.getElementById('delete-cliente-modal-close');
    if (e.target === delCliBackdrop || e.target === delCliCloseBtn) {
      closeDeleteClienteModal();
      return;
    }
  }
});

async function listarClientes() {
  const listEl = document.getElementById('clientes-list');
  listEl.innerHTML = 'Cargando...';
  try {
    const clientes = await fetchJSON('/clientes');
    listEl.innerHTML = '';
    clientes.forEach(c => {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        const left = document.createElement('div');
        left.textContent = `${c.dni} — ${c.nombre || ''} — ${c.telefono || ''}`;
      const actions = document.createElement('div');
      actions.className = 'btn-group';
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-sm btn-outline-primary';
      btnEdit.textContent = 'Editar';
      btnEdit.addEventListener('click', () => showEditCliente(c.dni));
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-outline-danger';
      btnDelete.textContent = 'Eliminar';
      btnDelete.addEventListener('click', () => eliminarCliente(c.dni));
      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);
      item.appendChild(left);
      item.appendChild(actions);
      listEl.appendChild(item);
    });
  } catch (err) {
    listEl.innerHTML = `<div class="text-danger">Error cargando clientes: ${err.message}</div>`;
  }
}

// --- Clientes CRUD UI handlers ---
function resetClienteForm() {
  const dni = document.getElementById('cliente-dni'); if (dni) { dni.value = ''; dni.disabled = false; }
  const nombre = document.getElementById('cliente-nombre'); if (nombre) nombre.value = '';
  const telefono = document.getElementById('cliente-telefono'); if (telefono) telefono.value = '';
  editingClienteDni = null;
}

function openClienteModal() {
  const modal = document.getElementById('cliente-modal');
  if (modal) modal.classList.remove('d-none');
}

function closeClienteModal() {
  const modal = document.getElementById('cliente-modal');
  if (modal) modal.classList.add('d-none');
  try { resetClienteForm(); } catch (e) {}
}

async function showCreateCliente() {
  document.getElementById('cliente-form-title').textContent = 'Crear cliente';
  resetClienteForm();
  openClienteModal();
}

let editingClienteDni = null;
async function showEditCliente(dni) {
  try {
    const c = await fetchJSON(`/clientes/${encodeURIComponent(dni)}`);
    document.getElementById('cliente-form-title').textContent = 'Editar cliente ' + dni;
    const dniEl = document.getElementById('cliente-dni'); if (dniEl) { dniEl.value = c.dni; dniEl.disabled = true; }
    const nombre = document.getElementById('cliente-nombre'); if (nombre) nombre.value = c.nombre || '';
    const telefono = document.getElementById('cliente-telefono'); if (telefono) telefono.value = c.telefono || '';
    editingClienteDni = dni;
    openClienteModal();
  } catch (err) {
    alert('Error cargando cliente: ' + err.message);
  }
}

async function crearActualizarCliente(e) {
  e.preventDefault();
  const dniEl = document.getElementById('cliente-dni');
  const nombreEl = document.getElementById('cliente-nombre');
  const telefonoEl = document.getElementById('cliente-telefono');
  const dni = dniEl ? dniEl.value.trim() : '';
  const nombre = nombreEl ? nombreEl.value.trim() : '';
  const telefono = telefonoEl ? telefonoEl.value.trim() : '';
  if (!dni || !nombre) {
    alert('DNI y Nombre son requeridos');
    return;
  }
  const payload = { nombre, telefono };
  try {
    if (editingClienteDni) {
      // do not send dni in payload when updating; DNI is read-only
      console.log('[CLIENTES] PUT payload ->', payload, 'url ->', `/clientes/${encodeURIComponent(editingClienteDni)}`);
      const res = await fetchJSON(`/clientes/${encodeURIComponent(editingClienteDni)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log('[CLIENTES] PUT response ->', res);
    } else {
      payload.dni = Number(dni);
      console.log('[CLIENTES] POST payload ->', payload, 'url ->', '/clientes');
      const res = await fetchJSON('/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log('[CLIENTES] POST response ->', res);
    }
    closeClienteModal();
    // refresh list and log current clients
    await listarClientes();
    fetch('/clientes').then(r => r.json()).then(data => console.log('[CLIENTES] current list ->', data)).catch(e => console.error(e));
  } catch (err) {
    // If server returned JSON in the error body, try to show it
    console.error('Error guardando cliente:', err);
    alert('Error guardando cliente: ' + err.message + '\nVer consola para más detalles.');
  }
}

// delete client flow
let pendingDeleteClienteDni = null;
function eliminarCliente(dni) {
  pendingDeleteClienteDni = dni;
  const modal = document.getElementById('delete-cliente-modal');
  const msg = document.getElementById('delete-cliente-message');
  if (msg) msg.textContent = `Eliminar cliente #${dni}? Esta acción es irreversible.`;
  if (modal) modal.classList.remove('d-none');
}

function closeDeleteClienteModal() {
  pendingDeleteClienteDni = null;
  const modal = document.getElementById('delete-cliente-modal');
  if (modal) modal.classList.add('d-none');
}

async function confirmDeleteCliente() {
  if (!pendingDeleteClienteDni) return closeDeleteClienteModal();
  try {
    await fetchJSON(`/clientes/${encodeURIComponent(pendingDeleteClienteDni)}`, { method: 'DELETE' });
    closeDeleteClienteModal();
    listarClientes();
  } catch (err) {
    closeDeleteClienteModal();
    alert('Error eliminando cliente: ' + err.message);
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
      item.className = 'list-group-item d-flex justify-content-between align-items-center';
      const fecha = r.fecha || '';
      const horariosLabel = (r.horarios_label && Array.isArray(r.horarios_label)) ? r.horarios_label.join(', ') : (r.horarios && Array.isArray(r.horarios) ? r.horarios.map(h => `${h.inicio}-${h.fin}`).join(', ') : '');
      const left = document.createElement('div');
      left.textContent = `#${r.id} — ${r.cancha_nombre || ('Cancha ' + (r.cancha_id||''))} — ${r.cliente_nombre||''} (${r.cliente_dni||''}) — ${fecha} — ${horariosLabel} — $${r.precio}`;
      const actions = document.createElement('div');
      actions.className = 'btn-group';
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-sm btn-outline-primary';
      btnEdit.textContent = 'Editar';
      btnEdit.setAttribute('data-action', 'edit');
      btnEdit.setAttribute('data-id', r.id);
      btnEdit.addEventListener('click', () => {
        try {
          console.log('[UI] Edit reserva clicked:', r.id);
          showEditReserva(r.id);
        } catch (e) {
          console.error('Error invoking showEditReserva:', e);
          alert('Error al intentar editar la reserva. Ver consola para más detalles.');
        }
      });
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-outline-danger';
      btnDelete.textContent = 'Eliminar';
      btnDelete.setAttribute('data-action', 'delete');
      btnDelete.setAttribute('data-id', r.id);
      btnDelete.addEventListener('click', () => eliminarReserva(r.id));
      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);
      item.appendChild(left);
      item.appendChild(actions);
      listEl.appendChild(item);
    });
  } catch (err) {
    listEl.innerHTML = `<div class="text-danger">Error cargando reservas: ${err.message}</div>`;
  }
}

// --- Reservas: editar/crear/eliminar usando el formulario existente ---
let editingReservaId = null;
async function showEditReserva(reservaId) {
  try {
    console.log('[UI] showEditReserva start for', reservaId);
    const r = await fetchJSON(`/reservas/${reservaId}`);
    console.log('[UI] showEditReserva fetched', r);
    // open reservation modal and populate form
    document.getElementById('reserva-form-title').textContent = 'Editar reserva ' + reservaId;
    openReservaModal();
    // set cancha select
    const canchaSel = document.getElementById('cancha-select');
    if (canchaSel) canchaSel.value = r.cancha_id || '';
    // set fecha
    const fechaEl = document.getElementById('fecha-select'); if (fechaEl) fechaEl.value = r.fecha || '';
    // load horarios and mark selected
    await listarHorarios(r.cancha_id, r.fecha);
    const horarioSelect = document.getElementById('horario-select');
    if (horarioSelect && Array.isArray(r.horarios)) {
      // mark options whose JSON value id matches
      Array.from(horarioSelect.options).forEach(opt => {
        try {
          const obj = JSON.parse(opt.value);
          opt.selected = r.horarios.some(h => Number(h.id) === Number(obj.id));
        } catch (e) {}
      });
    }
    // set cliente select
    await populateClientesSelect(r.cliente_dni);
    // set precio
    const precioEl = document.getElementById('precio'); if (precioEl) precioEl.value = r.precio || '';
    editingReservaId = reservaId;
  } catch (err) {
    console.error('Error in showEditReserva:', err);
    alert('Error cargando reserva: ' + err.message + '\nVer consola para más detalles.');
  }
}

function openReservaModal() {
  const modal = document.getElementById('reserva-modal');
  if (modal) modal.classList.remove('d-none');
}

function closeReservaModal() {
  const modal = document.getElementById('reserva-modal');
  if (modal) modal.classList.add('d-none');
  try { document.getElementById('reserva-form').reset(); } catch (e) {}
}

async function crearActualizarReserva(e) {
  e.preventDefault();
  const canchaId = parseInt(document.getElementById('cancha-select').value, 10);
  const clienteSelect = document.getElementById('reserva-cliente-select');
  const clienteDni = clienteSelect ? String(clienteSelect.value).trim() : '';
  const fecha = document.getElementById('fecha-select').value;
  const horarioSelectEl = document.getElementById('horario-select');
  const selectedOptions = Array.from(horarioSelectEl.selectedOptions).filter(o => o.value && !o.disabled);
  const horario_objs = selectedOptions.map(o => JSON.parse(o.value));
  const horario_ids = horario_objs.map(h => h.id);
  const precio = parseFloat(document.getElementById('precio').value);
  if (!canchaId || !clienteDni || !fecha || horario_ids.length === 0 || isNaN(precio)) {
    alert('Completar todos los campos requeridos para la reserva.');
    return;
  }
  const payload = { cancha_id: canchaId, cliente_dni: clienteDni, fecha: fecha, horario_ids: horario_ids, precio };
  try {
    if (editingReservaId) {
      console.log('[RESERVAS] PUT payload ->', payload, 'url ->', `/reservas/${editingReservaId}`);
      const res = await fetchJSON(`/reservas/${editingReservaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log('[RESERVAS] PUT response ->', res);
      editingReservaId = null;
    } else {
      console.log('[RESERVAS] POST payload ->', payload);
      const res = await fetchJSON('/reservas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log('[RESERVAS] POST response ->', res);
    }
    // close modal, reset form and refresh lists
    closeReservaModal();
    document.getElementById('reserva-form').reset();
    const horarioSelect = document.getElementById('horario-select'); if (horarioSelect) { horarioSelect.innerHTML = '<option value="">-- seleccionar horario --</option>'; horarioSelect.disabled = true; }
    try { await populateClientesSelect(); } catch (e) { /* ignore */ }
    listarReservas();
    listarCanchas();
  } catch (err) {
    console.error('Error guardando reserva:', err);
    alert('Error guardando reserva: ' + err.message);
  }
}

// populate clients dropdown for reservation form. If selectedDni provided, select it.
async function populateClientesSelect(selectedDni = null) {
  const sel = document.getElementById('reserva-cliente-select');
  if (!sel) return;
  try {
    const clientes = await fetchJSON('/clientes');
    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- seleccionar cliente --';
    sel.appendChild(placeholder);
    clientes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.dni;
      opt.textContent = `${c.dni} — ${c.nombre || ''}`;
      if (selectedDni && String(selectedDni) === String(c.dni)) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch (err) {
    sel.innerHTML = '<option value="">Error cargando clientes</option>';
  }
}

// delete reserva flow
let pendingDeleteReservaId = null;
function eliminarReserva(reservaId) {
  pendingDeleteReservaId = reservaId;
  const modal = document.getElementById('delete-reserva-modal');
  const msg = document.getElementById('delete-reserva-message');
  if (msg) msg.textContent = `Eliminar reserva #${reservaId}? Esta acción es irreversible.`;
  if (modal) modal.classList.remove('d-none');
}

function closeDeleteReservaModal() {
  pendingDeleteReservaId = null;
  const modal = document.getElementById('delete-reserva-modal');
  if (modal) modal.classList.add('d-none');
}

async function confirmDeleteReserva() {
  if (!pendingDeleteReservaId) return closeDeleteReservaModal();
  try {
    await fetchJSON(`/reservas/${pendingDeleteReservaId}`, { method: 'DELETE' });
    closeDeleteReservaModal();
    listarReservas();
  } catch (err) {
    closeDeleteReservaModal();
    alert('Error eliminando reserva: ' + err.message);
  }
}

// close/reserva modal handlers (close button, cancel)
const reservaCancelBtn = document.getElementById('reserva-cancel');
if (reservaCancelBtn) reservaCancelBtn.addEventListener('click', () => closeReservaModal());

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

// expose helpers to global scope for debugging and inline onclick usage
try {
  window.toggleServiciosMenu = toggleServiciosMenu;
  window.closeServiciosMenu = closeServiciosMenu;
  window.updateServiciosButtonLabel = updateServiciosButtonLabel;
} catch (e) {
  // ignore in non-browser env
}
