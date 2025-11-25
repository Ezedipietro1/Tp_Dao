const API_BASE = 'http://127.0.0.1:5000';
console.log('app.js loaded (v2)');
let canchasCache = [];
// Recent reservations created/updated in this client session (to avoid race conditions
// when a second reservation is created immediately after the first and server
// responses have not been refetched yet).
let recentReservations = [];
// token to prevent concurrent listarHorarios renders from appending duplicated DOM
let horarioRenderToken = 0;
// set of horario ids that belong to the reserva being edited (so they remain selectable)
let editingReservaHorarioIds = new Set();
// the original cancha id of the reserva being edited (used to detect cancha changes)
let editingReservaOriginalCanchaId = null;
// the original fecha (YYYY-MM-DD) of the reserva being edited
let editingReservaOriginalFecha = null;

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
      // if cancha has reservas, do not allow editing
      if (c.has_reservas) {
        btnEdit.disabled = true;
        btnEdit.title = 'No se puede editar: existen reservas asociadas';
      } else {
        btnEdit.addEventListener('click', () => showEditCancha(cid));
      }
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-outline-danger';
      btnDelete.textContent = 'Eliminar';
      if (c.has_reservas) {
        btnDelete.disabled = true;
        btnDelete.title = 'No se puede eliminar: existen reservas asociadas';
      } else {
        btnDelete.addEventListener('click', () => eliminarCancha(cid));
      }
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
  const horarioList = document.getElementById('horario-list');
  // require fecha
  if (!horarioList) return;
  if (!fecha) {
    horarioList.innerHTML = '<div class="text-muted">-- seleccionar fecha primero --</div>';
    computeAndShowPrice();
    return;
  }

  // validate fecha is not before today
  const today = new Date();
  const selDate = new Date(fecha + 'T00:00:00');
  if (selDate.setHours(0,0,0,0) < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
    horarioList.innerHTML = '<div class="text-danger">Fecha inválida (anterior al día actual)</div>';
    computeAndShowPrice();
    return;
  }

  horarioList.innerHTML = '<div class="text-muted">-- cargando horarios --</div>';
  console.debug('[listarHorarios] start', { canchaId, fecha });
  try {
    const hs = await fetchJSON(`/horarios`);
    // horarios are global (no dia_semana). Show all and let the user select one or more via checkboxes.
    horarioList.innerHTML = '';
    // determine if fecha is today to disable past slots
    const todayStr = new Date().toISOString().slice(0,10);
    const fechaIsToday = (fecha === todayStr);
    function parseToMinutes(t) {
      const parts = t.split(':').map(p => parseInt(p, 10));
      return parts[0]*60 + (parts[1]||0);
    }
    const now = new Date();
    const nowMinutes = now.getHours()*60 + now.getMinutes();

    // load existing reservas for this cancha/date and build a map horario_id -> [reserva_ids]
    let reservedMap = new Map();
    try {
      if (!canchaId || isNaN(Number(canchaId))) {
        console.debug('[listarHorarios] skipping reservas fetch: invalid canchaId', canchaId);
      } else {
        // add a timestamp to avoid stale cached responses
        const reservas = await fetchJSON(`/reservas?cancha_id=${canchaId}&_ts=${Date.now()}`);
        reservas.forEach(r => {
          try {
            if (r && r.fecha === fecha && Array.isArray(r.horarios)) {
              r.horarios.forEach(hobj => {
                const hid = Number(hobj.id);
                if (!reservedMap.has(hid)) reservedMap.set(hid, []);
                reservedMap.get(hid).push(r.id);
              });
            }
          } catch (e) { /* ignore malformed reserva entries */ }
        });
      }
    } catch (e) {
      // if reservas endpoint fails, we continue but won't mark ocupados
      console.warn('No se pudieron cargar reservas para marcar horarios ocupados', e);
    }

    // always merge recentReservations (even if the GET failed or returned empty)
    try {
      recentReservations.forEach(r => {
        if (r && Number(r.cancha_id) === Number(canchaId) && String(r.fecha) === String(fecha)) {
          if (Array.isArray(r.horarios)) {
            r.horarios.forEach(hobj => {
              const hid = Number(hobj.id);
              if (!reservedMap.has(hid)) reservedMap.set(hid, []);
              reservedMap.get(hid).push(r.id);
            });
          }
        }
      });
    } catch (mergeErr) {
      console.warn('Error merging recentReservations (post-fetch)', mergeErr);
    }

    // Debug: show editingReservaHorarioIds and reservedMap snapshot
    try {
      console.debug('[listarHorarios] editingReservaHorarioIds ->', Array.from(editingReservaHorarioIds || []));
      const reservedSnapshot = {};
      reservedMap.forEach((v, k) => { reservedSnapshot[k] = v.slice(); });
      console.debug('[listarHorarios] reservedMap snapshot ->', reservedSnapshot);
    } catch (dbgErr) { /* ignore debug errors */ }

    // if another listarHorarios was started after this one, abort rendering
    const myToken = ++horarioRenderToken;
    console.debug('[listarHorarios] render token', myToken);

    hs.forEach(h => {
      const id = h.id;
      // if an element with this horario id already exists in the DOM, update it instead of skipping
      let existingItem = null;
      try {
        existingItem = horarioList.querySelector(`#horario-${id}`) ? horarioList.querySelector(`#horario-${id}`).closest('.form-check') : null;
        if (existingItem) {
          console.debug('[listarHorarios] updating existing horario element', id);
        }
      } catch (e) { existingItem = null; }
      const startM = parseToMinutes(h.inicio);
      const disabledByTime = fechaIsToday && (startM < nowMinutes);

      const item = existingItem || document.createElement('div');
      item.className = 'form-check';

      // create or reuse checkbox
      let cb = item.querySelector(`#horario-${id}`);
      if (!cb) {
        cb = document.createElement('input');
        cb.className = 'form-check-input';
        cb.type = 'checkbox';
        cb.id = `horario-${id}`;
        cb.addEventListener('change', computeAndShowPrice);
        item.appendChild(cb);
      }
      cb.value = JSON.stringify(h);
      cb.dataset.hid = id;

      // determine if this horario is occupied by any reserva
      const occupiedBy = reservedMap.get(Number(id)) || [];
      let occupied = false;
      if (occupiedBy.length > 0) {
        // Allow editingReservaHorarioIds to make horarios selectable ONLY if
        // the user is editing a reserva that originally belongs to the same cancha+fecha.
        const editingReservaMatchesContext = (editingReservaOriginalCanchaId != null && Number(editingReservaOriginalCanchaId) === Number(canchaId) && editingReservaOriginalFecha && String(editingReservaOriginalFecha) === String(fecha));
        if (editingReservaMatchesContext && editingReservaHorarioIds && editingReservaHorarioIds.has(Number(id))) {
          occupied = false;
        } else if (typeof editingReservaId === 'number' && editingReservaId) {
          // otherwise, consider occupied only if there are other reservas (not the one being edited)
          const others = occupiedBy.filter(rid => Number(rid) !== Number(editingReservaId));
          occupied = others.length > 0;
        } else {
          occupied = true;
        }
      }

      if (disabledByTime || occupied) cb.disabled = true;

      let label = item.querySelector(`label[for='horario-${id}']`);
      if (!label) {
        label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = cb.id;
        item.appendChild(label);
      }
      label.textContent = `${h.inicio}-${h.fin}` + (disabledByTime ? ' — NO DISPONIBLE' : (occupied ? ' — OCUPADO' : ''));
      if (occupied) {
        label.title = `Ocupado por reserva(s): ${reservedMap.get(Number(id)).join(', ')}`;
      } else {
        label.title = '';
      }
      // ensure this render is still current
      if (myToken !== horarioRenderToken) {
        console.debug('[listarHorarios] aborting update/append for', id, 'token', myToken, 'current', horarioRenderToken);
        return;
      }
      console.debug('[listarHorarios] append/update horario', id, 'token', myToken);
      if (!existingItem) horarioList.appendChild(item);
    });
    // recompute precio if needed
    if (myToken === horarioRenderToken) computeAndShowPrice();
  } catch (err) {
    horarioList.innerHTML = `<div class="text-danger">Error: ${err.message}</div>`;
  }
// NOTE: manual datetime inputs were removed; reservas must be created via fecha + horario
// The form submit and cancha-select change listeners are attached once during initialization.

}

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
    const horarioList = document.getElementById('horario-list');
    if (horarioList) horarioList.innerHTML = '<div class="text-muted">-- seleccionar fecha primero --</div>';
  }
});

window.addEventListener('load', () => {
  listarCanchas();
  // set fecha min to today
  const todayStr = new Date().toISOString().slice(0,10);
  const fechaEl = document.getElementById('fecha-select');
  if (fechaEl) fechaEl.setAttribute('min', todayStr);
  // disable horario until user picks a date
  const horarioList = document.getElementById('horario-list');
  if (horarioList) {
    horarioList.innerHTML = '<div class="text-muted">-- seleccionar fecha primero --</div>';
  }
  const horarioListEl = document.getElementById('horario-list');
  if (horarioListEl) horarioListEl.addEventListener('change', computeAndShowPrice);
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
    console.debug('[UI] btn-crear-reserva clicked');
    // open reservation modal for creating a new reserva
    try {
      document.getElementById('reserva-form-title').textContent = 'Crear reserva';
      openReservaModal();
      const form = document.getElementById('reserva-form');
      if (form) {
        try { form.reset(); } catch (e) { console.warn('Could not reset reserva-form', e); }
      }
      editingReservaId = null;
      try { editingReservaHorarioIds = new Set(); editingReservaOriginalCanchaId = null; } catch (e) {}
      const horarioList = document.getElementById('horario-list');
      if (horarioList) { horarioList.innerHTML = '<div class="text-muted">-- seleccionar fecha primero --</div>'; }
      // load clients list into the select
      try { populateClientesSelect(); } catch (e) { console.error('Error cargando clientes para crear reserva', e); }
    } catch (err) {
      console.error('[UI] error handling btn-crear-reserva click', err);
      // ensure we don't accidentally navigate away; keep the reservas view visible
      try { show('reservas-section'); } catch (e) {}
    }
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
  // attach reserva form submit handler once
  const reservaForm = document.getElementById('reserva-form');
  if (reservaForm) reservaForm.addEventListener('submit', crearActualizarReserva);
  // when cancha selection changes, if fecha is present reload horarios
  const canchaSelectEl = document.getElementById('cancha-select');
  if (canchaSelectEl) {
    canchaSelectEl.addEventListener('change', (ev) => {
      const newCancha = parseInt(ev.target.value, 10);
      const fecha = document.getElementById('fecha-select').value;
      console.debug('[UI] cancha-select changed', { newCancha, fecha, editingReservaId, editingReservaOriginalCanchaId });
      // if we're editing a reserva and the cancha changed away from the original, clear horario ids
      if (editingReservaId && editingReservaOriginalCanchaId != null && Number(newCancha) !== Number(editingReservaOriginalCanchaId)) {
        console.debug('[UI] cancha changed during edit - clearing editingReservaHorarioIds and original identifiers');
        try { editingReservaHorarioIds = new Set(); editingReservaOriginalCanchaId = null; editingReservaOriginalFecha = null; } catch (e) {}
      }
      if (newCancha && fecha) {
        listarHorarios(newCancha, fecha);
      }
    });
  }
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
  // Frontend validation: dni 7-8 digits, nombre only letters/spaces, telefono digits only (if provided)
  const dniDigits = /^[0-9]{7,8}$/;
  const nombreRe = /^[A-Za-zÀ-ÿ\s]+$/;
  const telefonoRe = /^\d*$/;
  if (!dniDigits.test(dni)) {
    showAlert('danger', 'DNI inválido: debe contener sólo 7 u 8 dígitos.');
    if (dniEl) dniEl.focus();
    return;
  }
  if (!nombreRe.test(nombre)) {
    showAlert('danger', 'Nombre inválido: solo se permiten letras y espacios.');
    if (nombreEl) nombreEl.focus();
    return;
  }
  if (telefono && !telefonoRe.test(telefono)) {
    showAlert('danger', 'Teléfono inválido: solo se permiten dígitos.');
    if (telefonoEl) telefonoEl.focus();
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
      // ensure we send dni as number when creating
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
    // Use fetch directly so we can read error JSON and avoid relying on fetchJSON's thrown message
    const url = API_BASE + `/clientes/${encodeURIComponent(pendingDeleteClienteDni)}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      // prefer server-provided id in response body
      let respJson = {};
      try { respJson = await res.json(); } catch (e) {}
      const deletedId = respJson.dni || respJson.cliente_dni || pendingDeleteClienteDni;
      closeDeleteClienteModal();
      listarClientes();
      showAlert('success', `Cliente ${deletedId} eliminado correctamente`);
      return;
    }
    // try to read structured error from body
    let bodyText = await res.text();
    let userMsg = `HTTP ${res.status}`;
    try {
      const obj = JSON.parse(bodyText);
      userMsg = obj.error || obj.detail || JSON.stringify(obj);
    } catch (e) {
      // if bodyText is plain text, use it
      if (bodyText && bodyText.trim()) userMsg = bodyText.trim();
    }
    closeDeleteClienteModal();
    showAlert('danger', `Error eliminando cliente: ${userMsg}`);
  } catch (err) {
    closeDeleteClienteModal();
    console.error('Error eliminando cliente (network):', err);
    showAlert('danger', `Error eliminando cliente: ${err.message || String(err)}`);
  }
}

// showAlert: type = 'success' | 'danger' | 'warning' | 'info'
function showAlert(type, message, timeout = 6000) {
  const container = document.getElementById('alert-container');
  if (!container) {
    // fallback to alert()
    alert(message);
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.className = `alert alert-${type} alert-dismissible fade show`;
  wrapper.setAttribute('role', 'alert');
  wrapper.innerHTML = `
    <div>${message}</div>
    <button type="button" class="btn-close" aria-label="Close"></button>
  `;
  const closeBtn = wrapper.querySelector('.btn-close');
  closeBtn.addEventListener('click', () => { try { container.removeChild(wrapper); } catch (e) {} });
  container.appendChild(wrapper);
  if (timeout > 0) {
    setTimeout(() => {
      try { wrapper.classList.remove('show'); wrapper.classList.add('hide'); container.removeChild(wrapper); } catch (e) {}
    }, timeout);
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
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-outline-danger';
      btnDelete.textContent = 'Eliminar';
      btnDelete.setAttribute('data-action', 'delete');
      btnDelete.setAttribute('data-id', r.id);
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
    // mark that we're editing this reserva so listarHorarios can allow its own horarios
    editingReservaId = reservaId;
    try {
      editingReservaHorarioIds = new Set((r.horarios || []).map(h => Number(h.id)));
    } catch (e) {
      editingReservaHorarioIds = new Set();
    }
    // remember original cancha and fecha for this reserva so we can detect changes
    try { editingReservaOriginalCanchaId = r.cancha_id || null; } catch (e) { editingReservaOriginalCanchaId = null; }
    try { editingReservaOriginalFecha = r && r.fecha ? String(r.fecha).slice(0,10) : null; } catch (e) { editingReservaOriginalFecha = null; }
    // load horarios and mark selected
    await listarHorarios(r.cancha_id, r.fecha);
    const horarioList = document.getElementById('horario-list');
    if (horarioList && Array.isArray(r.horarios)) {
      const selectedIds = new Set(r.horarios.map(h => Number(h.id)));
      horarioList.querySelectorAll('input[type=checkbox]').forEach(cb => {
        try {
          const obj = JSON.parse(cb.value);
          cb.checked = selectedIds.has(Number(obj.id));
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
    // clear editing flag on error
    try { editingReservaId = null; } catch (e) {}
  }
}

function openReservaModal() {
  console.debug('[UI] openReservaModal');
  const modal = document.getElementById('reserva-modal');
  if (modal) modal.classList.remove('d-none');
}

function closeReservaModal() {
  const modal = document.getElementById('reserva-modal');
  if (modal) modal.classList.add('d-none');
  try { document.getElementById('reserva-form').reset(); } catch (e) {}
  // clear editing reservation context
  try { editingReservaId = null; editingReservaHorarioIds = new Set(); editingReservaOriginalCanchaId = null; } catch (e) {}
}

async function crearActualizarReserva(e) {
  e.preventDefault();
  const canchaId = parseInt(document.getElementById('cancha-select').value, 10);
  const clienteSelect = document.getElementById('reserva-cliente-select');
  const clienteDni = clienteSelect ? String(clienteSelect.value).trim() : '';
  const fecha = document.getElementById('fecha-select').value;
  const horarioContainer = document.getElementById('horario-list');
  const checkedBoxes = horarioContainer ? Array.from(horarioContainer.querySelectorAll('input[type=checkbox]:checked')).filter(cb => !cb.disabled) : [];
  const horario_objs = checkedBoxes.map(cb => JSON.parse(cb.value));
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
      // update recentReservations: remove any previous entry with this id and add the updated one
      try {
        recentReservations = recentReservations.filter(r => Number(r.id) !== Number(editingReservaId));
        const updated = res.reserva ? res.reserva : { id: editingReservaId, cancha_id: canchaId, fecha: fecha, horarios: horario_objs };
        // normalize horarios
        const hrs = Array.isArray(updated.horarios) ? updated.horarios.map(h => (h && h.id ? { id: h.id, inicio: h.inicio, fin: h.fin } : h)) : horario_objs.map(h => ({ id: h.id, inicio: h.inicio, fin: h.fin }));
        recentReservations.push({ id: updated.id || editingReservaId, cancha_id: canchaId, fecha: fecha, horarios: hrs });
      } catch (e) { console.warn('Error updating recentReservations after PUT', e); }
      editingReservaId = null;
    } else {
      console.log('[RESERVAS] POST payload ->', payload);
      const res = await fetchJSON('/reservas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log('[RESERVAS] POST response ->', res);
      try {
        const newId = res.reserva_id || res.id;
        const hrs = horario_objs.map(h => ({ id: h.id, inicio: h.inicio, fin: h.fin }));
        if (newId) {
            recentReservations.push({ id: newId, cancha_id: canchaId, fecha: fecha, horarios: hrs });
          }
        try { editingReservaHorarioIds = new Set(); } catch (e) {}
      } catch (e) { console.warn('Error adding recentReservations after POST', e); }
    }
    // close modal, reset form and refresh lists
    closeReservaModal();
    document.getElementById('reserva-form').reset();
    const horarioListAfter = document.getElementById('horario-list'); if (horarioListAfter) horarioListAfter.innerHTML = '<div class="text-muted">-- seleccionar fecha primero --</div>';
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
    const url = API_BASE + `/reservas/${pendingDeleteReservaId}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      let respJson = {};
      try { respJson = await res.json(); } catch (e) {}
      const deletedId = respJson.reserva_id || respJson.id || pendingDeleteReservaId;
      // remove any in-memory recent reservation matching this id
      try { recentReservations = recentReservations.filter(r => Number(r.id) !== Number(deletedId)); } catch (e) { /* ignore */ }
      closeDeleteReservaModal();
      listarReservas();
      showAlert('success', `Reserva ${deletedId} eliminada correctamente`);
      return;
    }
    let bodyText = await res.text();
    let userMsg = `HTTP ${res.status}`;
    try {
      const obj = JSON.parse(bodyText);
      userMsg = obj.error || obj.detail || JSON.stringify(obj);
    } catch (e) {
      if (bodyText && bodyText.trim()) userMsg = bodyText.trim();
    }
    closeDeleteReservaModal();
    showAlert('danger', `Error eliminando reserva: ${userMsg}`);
  } catch (err) {
    closeDeleteReservaModal();
    console.error('Error eliminando reserva (network):', err);
    showAlert('danger', `Error eliminando reserva: ${err.message || String(err)}`);
  }
}

// close/reserva modal handlers (close button, cancel)
const reservaCancelBtn = document.getElementById('reserva-cancel');
if (reservaCancelBtn) reservaCancelBtn.addEventListener('click', () => closeReservaModal());

// manual datetime inputs removed; no visibility toggling needed

function computeAndShowPrice() {
  try {
    const canchaId = parseInt(document.getElementById('cancha-select').value, 10);
    const horarioList = document.getElementById('horario-list');
    const precioEl = document.getElementById('precio');
    if (!canchaId || !horarioList) {
      if (precioEl) precioEl.value = '';
      return;
    }
    const checkedBoxes = Array.from(horarioList.querySelectorAll('input[type=checkbox]:checked')).filter(cb => !cb.disabled);
    if (checkedBoxes.length === 0) {
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
    checkedBoxes.forEach(cb => {
      try {
        const h = JSON.parse(cb.value);
        const startM = parseToMinutes(h.inicio);
        const endM = parseToMinutes(h.fin);
        let diff = endM - startM;
        if (diff <= 0) diff += 24*60;
        totalHours += diff/60;
      } catch (e) {
        // ignore malformed value
      }
    });
    const total = Math.round((totalHours * precioHora + Number.EPSILON) * 100) / 100;
    if (precioEl) precioEl.value = total.toFixed(2);
  } catch (e) {
    // ignore
  }
}

// attach compute price listener once (attached earlier during window.load)

// expose helpers to global scope for debugging and inline onclick usage
try {
  window.toggleServiciosMenu = toggleServiciosMenu;
  window.closeServiciosMenu = closeServiciosMenu;
  window.updateServiciosButtonLabel = updateServiciosButtonLabel;
} catch (e) {
  // ignore in non-browser env
}
