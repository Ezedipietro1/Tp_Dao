const API_BASE = 'http://127.0.0.1:5000';
let canchasCache = [];

async function fetchJSON(path, opts) {
  // Prevent returning cached GET responses: force no-store and append timestamp
  opts = opts ? Object.assign({}, opts) : {};
  const method = (opts.method || 'GET').toUpperCase();
  if (method === 'GET') {
    opts.cache = 'no-store';
    // append cache-busting timestamp to URL
    const ts = '_=' + Date.now();
    if (path.includes('?')) path = path + '&' + ts;
    else path = path + '?' + ts;
  }
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
    ['main-menu','canchas-section','reserva-section','clientes-section','reservas-section','reportes-section'].forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.add('d-none');
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove('d-none');
  };
  const btnCanchas = document.getElementById('btn-canchas');
  if (btnCanchas) btnCanchas.addEventListener('click', () => { show('canchas-section'); listarCanchas(); });
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
  const btnClientes = document.getElementById('btn-clientes');
  if (btnClientes) btnClientes.addEventListener('click', () => { show('clientes-section'); listarClientes(); });
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
  // reportes view
  const btnReportes = document.getElementById('btn-reportes');
  if (btnReportes) btnReportes.addEventListener('click', () => { show('reportes-section'); });
  // Navbar link wiring: if nav links exist, call the same handlers as buttons
  const navMap = [
    {nav: 'nav-home', target: 'main-menu'},
    {nav: 'nav-canchas', target: 'canchas-section'},
    {nav: 'nav-reservas', target: 'reservas-section'},
    {nav: 'nav-clientes', target: 'clientes-section'},
    {nav: 'nav-reportes', target: 'reportes-section'}
  ];
  navMap.forEach(m => {
    const el = document.getElementById(m.nav);
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        // If user clicked Inicio, close overlay and show main menu
        if (m.target === 'main-menu') {
          // If overlay is open, navigate back so popstate restores UI; otherwise just show main menu
          if (pageOverlay && !pageOverlay.classList.contains('d-none')) {
            try { history.back(); } catch (e) { /* ignore */ }
          } else {
            try { closePageOverlay(); } catch (e) { /* ignore */ }
            ['main-menu','canchas-section','reserva-section','clientes-section','reservas-section','reportes-section'].forEach(s => { const se = document.getElementById(s); if (se) se.classList.add('d-none'); });
            const t = document.getElementById('main-menu'); if (t) t.classList.remove('d-none');
          }
        } else {
          // open the selected section as a standalone page in the overlay
          openSectionInPage(m.target);
        }
        try { const bsCollapse = document.querySelector('.navbar-collapse'); if (bsCollapse && bsCollapse.classList.contains('show')) bsCollapse.classList.remove('show'); } catch(e){}
      } catch (err) { console.error('Nav click error', err); }
    });
  });

  // Page overlay helpers: move section into overlay and restore on close
  const pageOverlay = document.getElementById('page-overlay');
  const pageInnerBody = document.querySelector('#page-overlay .page-inner-body');
  window._movedSections = window._movedSections || {};

  function openSectionInPage(sectionId) {
    const sec = document.getElementById(sectionId);
    if (!sec) return;
    // store original parent/nextSibling to restore later
    if (!window._movedSections[sectionId]) {
      window._movedSections[sectionId] = { parent: sec.parentNode, nextSibling: sec.nextSibling, wasHidden: sec.classList.contains('d-none') };
    }
    // hide all main sections before showing the overlay
    ['main-menu','canchas-section','reserva-section','clientes-section','reservas-section','reportes-section'].forEach(s => { const se = document.getElementById(s); if (se) se.classList.add('d-none'); });
    // move the real section node into the overlay body
    pageInnerBody.innerHTML = '';
    // ensure it's visible inside the overlay
    sec.classList.remove('d-none');
    pageInnerBody.appendChild(sec);
    pageOverlay.classList.remove('d-none');
    // mark body so we can hide the rest of the app and make overlay exclusive
    document.body.classList.add('overlay-open');
    document.body.style.overflow = 'hidden';
    // push history state so the overlay behaves like a separate page
    try {
      const hash = '#' + sectionId;
      // Only push if current hash is different to avoid duplicate history entries
      if (location.hash !== hash) {
        history.pushState({ overlay: sectionId }, '', hash);
      } else {
        // replace state if same hash but no state
        if (!history.state || history.state.overlay !== sectionId) history.replaceState({ overlay: sectionId }, '', hash);
      }
    } catch (e) {
      // ignore history errors (e.g. restrictive envs)
    }
  }

  function closePageOverlay() {
    // find moved section inside overlay and restore
    Object.keys(window._movedSections).forEach(id => {
      const info = window._movedSections[id];
      const node = document.getElementById(id);
      if (node && info && info.parent) {
        // restore to original position
        if (info.nextSibling) info.parent.insertBefore(node, info.nextSibling);
        else info.parent.appendChild(node);
        // restore hidden state if it was hidden originally
        if (info.wasHidden) node.classList.add('d-none');
        delete window._movedSections[id];
      }
    });
    pageInnerBody.innerHTML = '';
    pageOverlay.classList.add('d-none');
    document.body.classList.remove('overlay-open');
    document.body.style.overflow = '';
    // If URL still references the overlay, navigate back so browser history is consistent
    try {
      // if the current history state indicates an overlay, go back one step
      if (history.state && history.state.overlay) {
        history.back();
      } else if (location.hash && location.hash.length > 0) {
        // fallback: clear hash
        history.replaceState(null, '', location.pathname + location.search);
      }
    } catch (e) { /* ignore */ }
  }

  // Closing overlay is handled only by clicking the logo or 'Inicio' in navbar (handled below).

  // When clicking the navbar brand (logo), act like 'Inicio' and restore main menu
  const navbarBrand = document.querySelector('.navbar-brand');
  if (navbarBrand) {
    navbarBrand.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        // if overlay open, trigger back navigation so popstate handler restores UI
        if (pageOverlay && !pageOverlay.classList.contains('d-none')) {
          history.back();
        } else {
          // otherwise just show main menu
          ['main-menu','canchas-section','reserva-section','clientes-section','reservas-section','reportes-section'].forEach(s => { const se = document.getElementById(s); if (se) se.classList.add('d-none'); });
          const t = document.getElementById('main-menu'); if (t) t.classList.remove('d-none');
        }
      } catch (err) { console.error('Error closing overlay from logo', err); }
    });
  }
  const btnReporteReservas = document.getElementById('btn-reporte-reservas');
  const btnReporteIngresos = document.getElementById('btn-reporte-ingresos');
  const btnReporteClientes = document.getElementById('btn-reporte-clientes');
  const btnReportePorCanchas = document.getElementById('btn-reporte-reservas-por-canchas');
  function openReportViewer(title, url) {
    const modal = document.getElementById('report-viewer-modal');
    const iframe = document.getElementById('report-viewer-iframe');
    const download = document.getElementById('report-viewer-download');
    if (!modal || !iframe || !download) return;
    document.getElementById('report-viewer-title').textContent = title;
    iframe.src = url;
    download.href = url + (url.includes('?') ? '&download=1' : '?download=1');
    modal.classList.remove('d-none');
  }
  // wire report buttons
  if (btnReporteReservas) btnReporteReservas.addEventListener('click', async () => {
    if (window.__renderReservasClientesInteractive) window.__renderReservasClientesInteractive();
  });
  if (btnReporteIngresos) btnReporteIngresos.addEventListener('click', async () => {
    if (window.__renderCanchasMasUtilizadas) window.__renderCanchasMasUtilizadas();
  });
  if (btnReporteClientes) btnReporteClientes.addEventListener('click', async () => {
    const anio = prompt('Año (YYYY) para el reporte de utilización mensual:');
    if (!anio) return;
    if (window.__renderUtilizacionMensual) window.__renderUtilizacionMensual(anio);
  });
  // abrir modal de selección de período para el nuevo reporte
  if (btnReportePorCanchas) btnReportePorCanchas.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      console.log('[REPORTES] abrir modal periodo');
      const modal = document.getElementById('report-period-modal');
      if (!modal) { console.error('Modal de periodo no encontrado'); return; }
      // set defaults: desde = hoy - 30d, hasta = hoy
      const hoy = new Date().toISOString().slice(0,10);
      const desdeEl = document.getElementById('report-desde');
      const hastaEl = document.getElementById('report-hasta');
      if (desdeEl && hastaEl) {
        hastaEl.value = hoy;
        const d = new Date(); d.setDate(d.getDate() - 30);
        desdeEl.value = d.toISOString().slice(0,10);
      }
      modal.classList.remove('d-none');
    } catch (err) {
      console.error('Error mostrando modal de periodo:', err);
    }
  });

  // handlers para el modal de periodo
  const reportPeriodForm = document.getElementById('report-period-form');
  const reportPeriodCancel = document.getElementById('report-period-cancel');
  const reportPeriodClose = document.getElementById('report-period-close');
  const reportPeriodBackdrop = document.getElementById('report-period-backdrop');
  if (reportPeriodCancel) reportPeriodCancel.addEventListener('click', () => document.getElementById('report-period-modal').classList.add('d-none'));
  if (reportPeriodClose) reportPeriodClose.addEventListener('click', () => document.getElementById('report-period-modal').classList.add('d-none'));
  if (reportPeriodBackdrop) reportPeriodBackdrop.addEventListener('click', () => document.getElementById('report-period-modal').classList.add('d-none'));
  if (reportPeriodForm) reportPeriodForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    try {
      const desde = document.getElementById('report-desde').value;
      const hasta = document.getElementById('report-hasta').value;
      if (!desde || !hasta) { alert('Ambas fechas son requeridas'); return; }
      document.getElementById('report-period-modal').classList.add('d-none');
      const url = `${API_BASE}/reportes/reservas/por-canchas?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&download=0`;
      openReportViewer(`Reservas por canchas ${desde} — ${hasta}`, url);
    } catch (err) {
      console.error('Error procesando formulario de periodo:', err);
      alert('Error procesando el período. Revisá la consola.');
    }
  });
  // report viewer close handlers
  const reportViewerClose = document.getElementById('report-viewer-close');
  const reportViewerBackdrop = document.getElementById('report-viewer-backdrop');
  if (reportViewerClose) reportViewerClose.addEventListener('click', () => document.getElementById('report-viewer-modal').classList.add('d-none'));
  if (reportViewerBackdrop) reportViewerBackdrop.addEventListener('click', () => document.getElementById('report-viewer-modal').classList.add('d-none'));
  // back buttons inside sections
  document.querySelectorAll('.btn-back').forEach(b => b.addEventListener('click', () => show('main-menu')));
  // initial view: main menu
  show('main-menu');
  // Handle back/forward and initial hash: treat overlay sections as separate pages
  try {
    window.addEventListener('popstate', (ev) => {
      const st = ev.state;
      if (st && st.overlay) {
        // open the overlay for the requested section
        try { openSectionInPage(st.overlay); } catch (e) { /* ignore */ }
      } else {
        // no overlay state -> ensure overlay closed and show main menu
        try { closePageOverlay(); } catch (e) { /* ignore */ }
        ['main-menu','canchas-section','reserva-section','clientes-section','reservas-section','reportes-section'].forEach(s => { const se = document.getElementById(s); if (se) se.classList.add('d-none'); });
        const t = document.getElementById('main-menu'); if (t) t.classList.remove('d-none');
      }
    });

    // If page loaded with a hash, open the corresponding section in overlay
    if (location.hash && location.hash.length > 1) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        // replace state to reflect that the initial entry corresponds to this overlay
        history.replaceState({ overlay: id }, '', location.hash);
        try { openSectionInPage(id); } catch (e) { /* ignore */ }
      }
    }
  } catch (e) { /* ignore environments without history support */ }
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
      // if report panel is visible refresh it so new reservas appear without full reload
      try {
        const reportSection = document.getElementById('reportes-section');
        // Only refresh reports if the user is currently viewing the reports section
        if (reportSection && !reportSection.classList.contains('d-none')) {
          if (window.__renderReservasClientesInteractive) {
            window.__renderReservasClientesInteractive();
          } else if (window.__renderReservasPorCanchas) {
            const d = document.getElementById('ri-desde')?.value;
            const h = document.getElementById('ri-hasta')?.value;
            if (d && h) window.__renderReservasPorCanchas(d, h);
          }
        }
      } catch (e) { console.error('Error refrescando panel de reportes:', e); }
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
    // refresh report panel if visible so deletion appears immediately
    try {
      const reportSection = document.getElementById('reportes-section');
      if (reportSection && !reportSection.classList.contains('d-none')) {
        if (window.__renderReservasClientesInteractive) {
          window.__renderReservasClientesInteractive();
        } else if (window.__renderReservasPorCanchas) {
          const d = document.getElementById('ri-desde')?.value;
          const h = document.getElementById('ri-hasta')?.value;
          if (d && h) window.__renderReservasPorCanchas(d, h);
        }
      }
    } catch (e) { console.error('Error refrescando panel de reportes tras eliminar reserva:', e); }
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

// Global safe helper used by inline onclick in the report-period modal.
// This is defensive: it will work even if other event wiring fails.
try {
  window.__showReportForPeriod = function() {
    try {
      const desde = document.getElementById('report-desde')?.value;
      const hasta = document.getElementById('report-hasta')?.value;
      if (!desde || !hasta) { alert('Ambas fechas son requeridas'); return; }
      const url = `${API_BASE}/reportes/reservas/por-canchas?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&download=0`;
      const modal = document.getElementById('report-period-modal');
      if (modal) modal.classList.add('d-none');
      const viewerModal = document.getElementById('report-viewer-modal');
      const iframe = document.getElementById('report-viewer-iframe');
      const download = document.getElementById('report-viewer-download');
      const title = document.getElementById('report-viewer-title');
      if (iframe) iframe.src = url;
      if (download) download.href = url + '&download=1';
      if (title) title.textContent = `Reservas por canchas ${desde} — ${hasta}`;
      if (viewerModal) viewerModal.classList.remove('d-none');
    } catch (err) {
      console.error('Error en __showReportForPeriod:', err);
      alert('Error al generar el reporte. Revisá la consola para más detalles.');
    }
  };
} catch (e) {
  // ignore in non-browser env
}

// Render interactive report in-page: reservas por canchas
try {
  window.__renderReservasPorCanchas = async function(desde, hasta) {
    try {
      // close modal if open
      const modal = document.getElementById('report-period-modal');
      if (modal) modal.classList.add('d-none');
      // show reportes section and interactive panel
      const showSection = (id) => {
        ['main-menu','canchas-section','reserva-section','clientes-section','reservas-section','reportes-section'].forEach(s => {
          const el = document.getElementById(s);
          if (el) el.classList.add('d-none');
        });
        const target = document.getElementById('reportes-section');
        if (target) target.classList.remove('d-none');
      };
      showSection('reportes-section');
      const panel = document.getElementById('report-interactive');
      if (!panel) { alert('Panel de reportes no disponible'); return; }
      panel.classList.remove('d-none');
      // populate inputs
      const desdeEl = document.getElementById('ri-desde');
      const hastaEl = document.getElementById('ri-hasta');
      // record state for export
      window.__ri_last_view = { view: 'por-canchas', desde: (desdeEl && desdeEl.value) || desde || null, hasta: (hastaEl && hastaEl.value) || hasta || null };
      if (desdeEl) desdeEl.value = desde || (new Date(Date.now()-30*24*3600*1000)).toISOString().slice(0,10);
      if (hastaEl) hastaEl.value = hasta || new Date().toISOString().slice(0,10);

      async function loadAndRender() {
        const d = document.getElementById('ri-desde').value;
        const h = document.getElementById('ri-hasta').value;
        if (!d || !h) { alert('Ambas fechas son requeridas'); return; }
        const url = `${API_BASE}/reportes/json/reservas/por-canchas?desde=${encodeURIComponent(d)}&hasta=${encodeURIComponent(h)}&include_details=1`;
        const data = await fetchJSON(url);
        // update last-view dates in case inputs changed
        window.__ri_last_view = { view: 'por-canchas', desde: d, hasta: h };
        // render summary
        const sumEl = document.getElementById('ri-summary');
        const total = data.reduce((s,it)=>s+ (it.reservas_count||0),0);
        sumEl.innerHTML = `<strong>Total reservas en período:</strong> ${total}`;
        // render results table + bars
        const resEl = document.getElementById('ri-results');
        resEl.innerHTML = '';
        if (!data || data.length===0) { resEl.innerHTML = '<div>No hay datos para el período seleccionado.</div>'; return; }
        // determine max for bars
        const max = Math.max(...data.map(it=>it.reservas_count||0),1);
        const table = document.createElement('div');
        table.className = 'list-group';
        data.forEach(it => {
          const item = document.createElement('div');
          item.className = 'list-group-item';
          const header = document.createElement('div');
          header.className = 'd-flex justify-content-between align-items-center';
          const left = document.createElement('div');
          left.innerHTML = `<strong>Cancha ${it.cancha_id}</strong> ${it.tipo_nombre ? ('— '+it.tipo_nombre) : ''}`;
          const right = document.createElement('div');
          right.innerHTML = `<span class="badge bg-primary me-2">${it.reservas_count}</span>`;
          header.appendChild(left);
          header.appendChild(right);
          item.appendChild(header);
          // bar
          const barWrap = document.createElement('div');
          barWrap.style.marginTop = '8px';
          const barBg = document.createElement('div');
          barBg.style.background = '#eee';
          barBg.style.height = '12px';
          barBg.style.position = 'relative';
          const barInner = document.createElement('div');
          barInner.style.background = '#4c72b0';
          barInner.style.height = '100%';
          barInner.style.width = Math.round((it.reservas_count/max)*100) + '%';
          barBg.appendChild(barInner);
          barWrap.appendChild(barBg);
          item.appendChild(barWrap);
          // details (reservas list)
          if (it.reservas && it.reservas.length>0) {
            const details = document.createElement('div');
            details.style.marginTop = '8px';
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-secondary mb-2';
            btn.textContent = 'Ver reservas';
            let open = false;
            const list = document.createElement('div');
            list.style.display = 'none';
            btn.addEventListener('click', () => {
              open = !open;
              list.style.display = open ? 'block' : 'none';
              btn.textContent = open ? 'Ocultar reservas' : 'Ver reservas';
            });
            details.appendChild(btn);
            it.reservas.forEach(r => {
              const rdiv = document.createElement('div');
              rdiv.className = 'p-2 mb-1';
              rdiv.style.borderTop = '1px solid #f0f0f0';
              const horarios = (r.horarios||[]).map(h=>`${h.inicio}-${h.fin}`).join(', ');
              rdiv.innerHTML = `<div>#${r.id} — ${r.fecha} — DNI ${r.cliente_dni} — ${horarios} — $${r.precio}</div>`;
              list.appendChild(rdiv);
            });
            details.appendChild(list);
            item.appendChild(details);
          }
          table.appendChild(item);
        });
        resEl.appendChild(table);
        // update chart: canchas vs reservas_count
        try {
          const labels = data.map(it => `Cancha ${it.cancha_id}`);
          const values = data.map(it => it.reservas_count || 0);
          updateReportChart(labels, values, 'Reservas por cancha');
        } catch (e) { console.error('Error actualizando gráfico:', e); }
      }

      // attach filter/close events
      const filBtn = document.getElementById('ri-filtrar');
      const closeBtn = document.getElementById('ri-cerrar');
      const exportBtn = document.getElementById('ri-export');
      if (filBtn) {
        filBtn.onclick = loadAndRender;
      }
      if (exportBtn) exportBtn.onclick = () => { try { window.__exportReportPdf(); } catch(e){console.error(e);} };
      if (closeBtn) {
        closeBtn.onclick = () => { document.getElementById('report-interactive').classList.add('d-none'); document.getElementById('main-menu').classList.remove('d-none'); };
      }

      // initial load
      await loadAndRender();
    } catch (err) {
      console.error('Error renderizando reporte interactivo:', err);
      alert('Error al renderizar reporte. Revisá la consola.');
    }
  };
} catch (e) {
  // ignore
}

// Chart helper: creates or updates the canvas chart in the interactive panel
function updateReportChart(labels, values, title) {
  try {
    const ctx = document.getElementById('ri-chart');
    if (!ctx) return;
    // destroy previous chart if any
    if (window.__ri_chart) {
      try { window.__ri_chart.destroy(); } catch (e) { /* ignore */ }
      window.__ri_chart = null;
    }
    const data = {
      labels: labels,
      datasets: [{
        label: title || 'Datos',
        data: values,
        backgroundColor: labels.map((_,i) => `rgba(76,114,176,0.8)`),
        borderColor: labels.map((_,i) => `rgba(76,114,176,1)`),
        borderWidth: 1
      }]
    };
    window.__ri_chart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: !!title, text: title } },
        scales: { y: { beginAtZero: true, ticks: { precision:0 } } }
      }
    });
  } catch (e) { console.error('updateReportChart error', e); }
}

// Export current interactive report to PDF and download
try {
  window.__exportReportPdf = async function() {
    try {
      const state = window.__ri_last_view || {};
      if (!state.view) return alert('No hay reporte activo para exportar');
      let url = null;
      let filename = 'reporte.pdf';
      if (state.view === 'por-canchas') {
        const desde = state.desde || document.getElementById('ri-desde')?.value;
        const hasta = state.hasta || document.getElementById('ri-hasta')?.value;
        if (!desde || !hasta) return alert('Seleccioná rango Desde/Hasta antes de exportar.');
        url = `${API_BASE}/reportes/reservas/por-canchas?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&download=0`;
        filename = `reporte_reservas_canchas_${desde}_${hasta}.pdf`;
      } else if (state.view === 'por-clientes') {
        const dnis = state.dnis || null;
        if (!dnis || !Array.isArray(dnis) || dnis.length !== 1) {
          return alert('La exportación a PDF por cliente sólo está disponible para un cliente a la vez. Seleccioná exactamente un cliente.');
        }
        const dni = dnis[0];
        url = `${API_BASE}/reportes/reservas/cliente/${encodeURIComponent(dni)}?download=0`;
        filename = `reporte_reservas_cliente_${dni}.pdf`;
      } else {
        return alert('Tipo de reporte no soportado para exportar.');
      }

      // fetch PDF as blob and download
      const resp = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Error server: ${resp.status} - ${txt}`);
      }
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error exportando PDF: ' + (err.message || err));
    }
  };
} catch (e) {}

// Interactive renderer for 'Canchas más utilizadas'
try {
  window.__renderCanchasMasUtilizadas = async function(limite = 10) {
    try {
      // show report section
      document.getElementById('reportes-section').classList.remove('d-none');
      document.getElementById('main-menu').classList.add('d-none');
      const panel = document.getElementById('report-interactive');
      if (!panel) return alert('Panel de reportes no disponible');
      panel.classList.remove('d-none');
      document.getElementById('report-interactive-title').textContent = 'Canchas más utilizadas';
      // hide date inputs for this view
      document.getElementById('ri-desde').value = '';
      document.getElementById('ri-hasta').value = '';
      const resEl = document.getElementById('ri-results');
      resEl.innerHTML = 'Cargando...';
      const data = await fetchJSON(`/reportes/json/canchas/mas-utilizadas?limite=${encodeURIComponent(limite)}`);
      const max = Math.max(...data.map(it=>it.reservas_count||0),1);
      const table = document.createElement('div');
      table.className = 'list-group';
      data.forEach(it => {
        const item = document.createElement('div'); item.className='list-group-item';
        item.innerHTML = `<div class="d-flex justify-content-between"><div><strong>Cancha ${it.cancha_id}</strong> ${it.tipo_nombre? '— '+it.tipo_nombre : ''}</div><div><span class="badge bg-primary">${it.reservas_count}</span></div></div>`;
        const bar = document.createElement('div'); bar.style.marginTop='8px'; const bg=document.createElement('div'); bg.style.background='#eee'; bg.style.height='12px'; const inner=document.createElement('div'); inner.style.background='#4c72b0'; inner.style.height='100%'; inner.style.width = Math.round((it.reservas_count/max)*100)+'%'; bg.appendChild(inner); bar.appendChild(bg); item.appendChild(bar);
        table.appendChild(item);
      });
      resEl.innerHTML = '';
      resEl.appendChild(table);
    } catch (err) { console.error(err); alert('Error cargando ranking'); }
  };
} catch (e) {}

// Interactive renderer for reservas por cliente
try {
  window.__renderReservasPorCliente = async function(dni) {
    try {
      // record state so export knows which cliente to export
      window.__ri_last_view = { view: 'por-clientes', dnis: dni ? [String(dni)] : null, desde: null, hasta: null };
      if (!dni) return;
      document.getElementById('reportes-section').classList.remove('d-none');
      document.getElementById('main-menu').classList.add('d-none');
      const panel = document.getElementById('report-interactive');
      if (!panel) return alert('Panel de reportes no disponible');
      panel.classList.remove('d-none');
      document.getElementById('report-interactive-title').textContent = `Reservas - Cliente ${dni}`;
      const resEl = document.getElementById('ri-results'); resEl.innerHTML = 'Cargando...';
      const data = await fetchJSON(`/reservas?cliente_dni=${encodeURIComponent(dni)}`);
      if (!data || data.length === 0) { resEl.innerHTML = '<div>No hay reservas para ese cliente.</div>'; return; }
      // render list
      const table = document.createElement('div'); table.className='list-group';
      data.forEach(r => {
        const item = document.createElement('div'); item.className='list-group-item';
        const horarios = (r.horarios||[]).map(h=>`${h.inicio}-${h.fin}`).join(', ');
        item.innerHTML = `<div>#${r.id} — Cancha ${r.cancha_id||''} — ${r.fecha||''} — ${horarios} — $${r.precio||''}</div>`;
        table.appendChild(item);
      });
      resEl.innerHTML=''; resEl.appendChild(table);
    } catch (err) { console.error(err); alert('Error cargando reservas del cliente'); }
  };
} catch (e) {}

// Interactive renderer that shows reservations grouped by client and provides a client select filter
try {
  window.__renderReservasClientesInteractive = async function() {
    try {
      // set a baseline last-view so export is available even before filters are applied
      window.__ri_last_view = { view: 'por-clientes', dnis: null, desde: null, hasta: null };
      // show report section and panel
      document.getElementById('reportes-section').classList.remove('d-none');
      document.getElementById('main-menu').classList.add('d-none');
      const panel = document.getElementById('report-interactive');
      if (!panel) return alert('Panel de reportes no disponible');
      panel.classList.remove('d-none');
      document.getElementById('report-interactive-title').textContent = 'Reservas por cliente';

      const clienteButton = document.getElementById('ri-cliente-button');
      const clienteMenu = document.getElementById('ri-cliente-menu');
      const desdeEl = document.getElementById('ri-desde');
      const hastaEl = document.getElementById('ri-hasta');
      const resEl = document.getElementById('ri-results');

      // load clients and reservations in parallel
      const [clientes, reservas] = await Promise.all([
        fetchJSON('/clientes'),
        fetchJSON('/reservas')
      ]);

      // populate cliente multiselect menu (checkboxes). No selection = all clients
      if (clienteMenu && clienteButton) {
        clienteMenu.innerHTML = '';
        clientes.forEach(c => {
          const label = document.createElement('label');
          label.style.display = 'block';
          label.style.padding = '4px 8px';
          label.style.cursor = 'pointer';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.setAttribute('data-dni', c.dni);
          cb.value = c.dni;
          cb.addEventListener('change', () => {
            updateClienteButtonLabel();
          });
          label.appendChild(cb);
          const span = document.createElement('span');
          span.textContent = ` ${c.nombre || ''} (${c.dni})`;
          label.appendChild(span);
          clienteMenu.appendChild(label);
        });
        // clicking the button toggles the menu
        clienteButton.addEventListener('click', (e) => { e.stopPropagation(); clienteMenu.classList.toggle('d-none'); });
        // close menu when clicking outside
        document.addEventListener('click', (e) => { if (!clienteMenu.contains(e.target) && e.target !== clienteButton) clienteMenu.classList.add('d-none'); });
      }

      function updateClienteButtonLabel() {
        if (!clienteMenu || !clienteButton) return;
        const checked = Array.from(clienteMenu.querySelectorAll('input[type=checkbox]:checked'));
        if (checked.length === 0) {
          clienteButton.textContent = '-- Todos los clientes --';
        } else if (checked.length === 1) {
          const txt = checked[0].nextSibling ? checked[0].nextSibling.textContent.trim() : '1 seleccionado';
          clienteButton.textContent = txt;
        } else {
          clienteButton.textContent = `${checked.length} clientes seleccionados`;
        }
      }

      // helper to filter by date range using string comparison (YYYY-MM-DD)
      // avoids timezone/parsing inconsistencies by normalizing to date-only string
      function inRange(rFecha, desde, hasta) {
        if (!desde && !hasta) return true;
        if (!rFecha) return false;
        // normalize reservation date to YYYY-MM-DD
        const fechaStr = (typeof rFecha === 'string') ? rFecha.slice(0,10) : (new Date(rFecha)).toISOString().slice(0,10);
        if (desde && fechaStr < desde) return false;
        if (hasta && fechaStr > hasta) return false;
        return true;
      }

      function renderGrouped(selectedDnis) {
        const desdeVal = desdeEl?.value || '';
        const hastaVal = hastaEl?.value || '';
        // group reservas by cliente dni
        const map = new Map();
        reservas.forEach(r => {
          if (!inRange(r.fecha, desdeVal, hastaVal)) return;
          const dni = r.cliente_dni || r.cliente_dni;
          if (!dni) return;
          // if selectedDnis is null -> show all; else it should be an array of allowed dnis
          if (Array.isArray(selectedDnis) && selectedDnis.length > 0 && selectedDnis.indexOf(String(dni)) === -1) return;
          if (!map.has(dni)) map.set(dni, []);
          map.get(dni).push(r);
        });
        resEl.innerHTML = '';
        if (map.size === 0) { resEl.innerHTML = '<div>No hay reservas en el período para los clientes seleccionados.</div>'; return; }
        // update chart: clientes vs #reservas
        try {
          const labels = Array.from(map.keys()).map(dni => {
            const c = clientes.find(cc => String(cc.dni) === String(dni));
            return c ? (c.nombre || (`${dni}`)) : `${dni}`;
          });
          const values = Array.from(map.values()).map(rs => rs.length);
          updateReportChart(labels, values, 'Reservas por cliente');
        } catch (e) { console.error('Error actualizando gráfico (clientes):', e); }
        // For each client in map produce a card with their reservations
        for (const [dni, rs] of map.entries()) {
          const cliente = clientes.find(c => String(c.dni) === String(dni));
          const card = document.createElement('div'); card.className = 'card mb-2';
          const body = document.createElement('div'); body.className = 'card-body';
          const title = document.createElement('h5'); title.className = 'card-title'; title.textContent = `${cliente ? (cliente.nombre+'') : 'DNI '+dni}`;
          const subtitle = document.createElement('h6'); subtitle.className = 'card-subtitle mb-2 text-muted'; subtitle.textContent = `DNI: ${dni} — ${rs.length} reservas`; 
          body.appendChild(title); body.appendChild(subtitle);
          rs.forEach(r => {
            const div = document.createElement('div'); div.className = 'mb-1';
            const horariosLabel = (r.horarios && Array.isArray(r.horarios)) ? r.horarios.map(h => (h.inicio||h.inicio)+'-'+(h.fin||h.fin)).join(', ') : '';
            div.innerHTML = `<div>#${r.id} — Cancha ${r.cancha_id || ''} — ${r.fecha} — ${horariosLabel} — $${r.precio || ''}</div>`;
            body.appendChild(div);
          });
          card.appendChild(body);
          resEl.appendChild(card);
        }
      }

      // helper to read selected DNIs from checkbox menu: null => none selected -> treat as all
      function getSelectedDnis() {
        if (!clienteMenu) return null;
        const checked = Array.from(clienteMenu.querySelectorAll('input[type=checkbox]:checked')).map(cb => String(cb.getAttribute('data-dni')));
        return checked.length === 0 ? null : checked;
      }

      // initial render shows all
      renderGrouped(null);

      // wire select and filter button
      const filBtn = document.getElementById('ri-filtrar');
      const closeBtn = document.getElementById('ri-cerrar');
      const exportBtn = document.getElementById('ri-export');
      if (filBtn) filBtn.onclick = () => {
        const sel = getSelectedDnis();
        // update state
        window.__ri_last_view = Object.assign({}, window.__ri_last_view || {}, { view: 'por-clientes', dnis: sel, desde: desdeEl?.value || null, hasta: hastaEl?.value || null });
        renderGrouped(sel);
      };
      if (exportBtn) exportBtn.onclick = () => { try { window.__exportReportPdf(); } catch(e){console.error(e);} };
      // when checking/unchecking, optionally re-render immediately
      if (clienteMenu) clienteMenu.addEventListener('change', () => {
        // update button label
        updateClienteButtonLabel();
        // update last-view selection
        const sel = getSelectedDnis();
        window.__ri_last_view = Object.assign({}, window.__ri_last_view || {}, { view: 'por-clientes', dnis: sel, desde: desdeEl?.value || null, hasta: hastaEl?.value || null });
        // only auto render if reports section visible
        try { if (document.getElementById('reportes-section') && !document.getElementById('reportes-section').classList.contains('d-none')) renderGrouped(sel); } catch (e) {}
      });
      if (closeBtn) closeBtn.onclick = () => { panel.classList.add('d-none'); document.getElementById('main-menu').classList.remove('d-none'); };

    } catch (err) { console.error(err); alert('Error cargando reservas por cliente interactivo'); }
  };
} catch (e) {}

// Interactive renderer for utilización mensual
try {
  window.__renderUtilizacionMensual = async function(anio) {
    try {
      if (!anio) { anio = prompt('Año (YYYY):'); if (!anio) return; }
      document.getElementById('reportes-section').classList.remove('d-none');
      document.getElementById('main-menu').classList.add('d-none');
      const panel = document.getElementById('report-interactive');
      if (!panel) return alert('Panel de reportes no disponible');
      panel.classList.remove('d-none');
      document.getElementById('report-interactive-title').textContent = `Utilización mensual ${anio}`;
      const resEl = document.getElementById('ri-results'); resEl.innerHTML = 'Cargando...';
      const data = await fetchJSON(`/reportes/json/utilizacion/${encodeURIComponent(anio)}`);
      const counts = data.counts || [];
      const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      const max = Math.max(...counts,1);
      const table = document.createElement('div'); table.className='list-group';
      counts.forEach((c,i)=>{
        const item = document.createElement('div'); item.className='list-group-item';
        item.innerHTML = `<div class="d-flex justify-content-between"><div>${months[i]}</div><div><span class="badge bg-primary">${c}</span></div></div>`;
        const bar = document.createElement('div'); bar.style.marginTop='8px'; const bg=document.createElement('div'); bg.style.background='#eee'; bg.style.height='12px'; const inner=document.createElement('div'); inner.style.background='#4c72b0'; inner.style.height='100%'; inner.style.width = Math.round((c/max)*100)+'%'; bg.appendChild(inner); bar.appendChild(bg); item.appendChild(bar);
        table.appendChild(item);
      });
      resEl.innerHTML=''; resEl.appendChild(table);
    } catch (err) { console.error(err); alert('Error cargando utilización mensual'); }
  };
} catch (e) {}

// Fallback handler: if the specific report button exists but the main
// initialization didn't wire it (cache or load ordering issues), attach
// a simple click handler to open the periodo modal so the button is responsive.
(function attachFallbackReportButton(){
  try {
    const btn = document.getElementById('btn-reporte-reservas-por-canchas');
    if (!btn) return;
    // don't double-attach
    if (btn._fallbackAttached) return;
    btn.addEventListener('click', (e) => {
      try {
        e.preventDefault();
        const modal = document.getElementById('report-period-modal');
        if (!modal) {
          console.warn('Modal de periodo no encontrado');
          alert('No se encontró el modal de selección de período. Recargá la página e intentá de nuevo.');
          return;
        }
        modal.classList.remove('d-none');
      } catch (err) {
        console.error('Error fallback reporte por canchas:', err);
      }
    });
    btn._fallbackAttached = true;
  } catch (err) {
    // silenciar errores en entornos no-browser
  }
})();
