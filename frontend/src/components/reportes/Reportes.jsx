
		import React, { useEffect, useRef, useState } from "react";
		import { clientesService } from "../../services/clientes.service";
		import { reservasService } from "../../services/reservas.service";
		import { reportesService } from "../../services/reportes.service";
		import Chart from "chart.js/auto";

		const API_BASE = "http://127.0.0.1:5000";

		function Reportes() {
			const [mode, setMode] = useState('por-clientes');
			const [desde, setDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); });
			const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0,10));
			const [clientes, setClientes] = useState([]);
			const [reservas, setReservas] = useState([]);
			const [canchaData, setCanchaData] = useState([]);
			const [displayCards, setDisplayCards] = useState([]);
			const [selectedDnis, setSelectedDnis] = useState(null);
			const [summaryText, setSummaryText] = useState('');
			const chartRef = useRef(null);
			const chartInstance = useRef(null);
			const [clienteMenuOpen, setClienteMenuOpen] = useState(false);

			// Modal state for nicer year input
			const [yearModalOpen, setYearModalOpen] = useState(false);
			const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));

			useEffect(()=>{ clientesService.Buscar().then(d=>setClientes(d||[])).catch(()=>{}); }, []);

			function updateChart(labels, values, title) {
				try {
					const canvas = chartRef.current;
					if (!canvas) return;
					const ctx = canvas.getContext ? canvas.getContext('2d') : canvas;
					if (chartInstance.current) {
						chartInstance.current.data.labels = labels;
						chartInstance.current.data.datasets[0].data = values;
						if (chartInstance.current.options && chartInstance.current.options.plugins && chartInstance.current.options.plugins.title) chartInstance.current.options.plugins.title.text = title || '';
						chartInstance.current.update();
						return;
					}
					chartInstance.current = new Chart(ctx, {
						type: 'bar',
						data: { labels, datasets: [{ label: title || '', data: values, backgroundColor: labels.map(()=> 'rgba(76,114,176,0.8)'), borderColor: labels.map(()=> 'rgba(76,114,176,1)'), borderWidth: 1 }] },
						options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: !!title, text: title } }, scales: { y: { beginAtZero: true, ticks: { precision:0 } } } }
					});
				} catch (e) { console.error('updateChart error', e); }
			}

			async function exportPdf() {
				try {
					if (mode === 'por-clientes') {
						const sel = selectedDnis || null;
						if (!sel || sel.length !== 1) return alert('La exportación por cliente sólo está disponible para 1 cliente. Seleccioná exactamente uno.');
						const dni = sel[0];
						const url = `${API_BASE}/reportes/reservas/cliente/${encodeURIComponent(dni)}?download=1`;
						const resp = await fetch(url, { method: 'GET' });
						if (!resp.ok) throw new Error('Error server: ' + resp.status);
						const blob = await resp.blob();
						const blobUrl = URL.createObjectURL(blob);
						const a = document.createElement('a'); a.href = blobUrl; a.download = `reporte_reservas_cliente_${dni}.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
						return;
					}
					if (mode === 'por-canchas') {
						if (!desde || !hasta) return alert('Seleccioná desde y hasta antes de exportar.');
						const url = `${API_BASE}/reportes/reservas/por-canchas?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&download=1`;
						const resp = await fetch(url); if (!resp.ok) throw new Error('Error server: '+resp.status);
						const blob = await resp.blob(); const blobUrl = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=blobUrl; a.download = `reporte_reservas_canchas_${desde}_${hasta}.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
						return;
					}
					alert('Exportar PDF no soportado para este tipo de reporte.');
				} catch (e) { console.error('exportPdf error', e); alert('Error exportando PDF: '+ (e.message||e)); }
			}

			async function loadReservasClientesInteractive() {
				try {
					const [cli, res] = await Promise.all([clientesService.Buscar(), reservasService.Buscar()]);
					setClientes(cli || []);
					setReservas(res || []);
					renderGrouped(null, cli||[], res||[]);
				} catch (e) { console.error(e); alert('Error cargando datos de clientes/reservas'); }
			}

			function renderGrouped(selected, cliList, reservasList) {
				const desdeVal = desde || '';
				const hastaVal = hasta || '';
				function inRange(rFecha) {
					if (!desdeVal && !hastaVal) return true;
					if (!rFecha) return false;
					const fechaStr = (typeof rFecha === 'string') ? rFecha.slice(0,10) : (new Date(rFecha)).toISOString().slice(0,10);
					if (desdeVal && fechaStr < desdeVal) return false;
					if (hastaVal && fechaStr > hastaVal) return false;
					return true;
				}
				const map = new Map();
				(reservasList||[]).forEach(r => {
					if (!inRange(r.fecha)) return;
					const dni = String(r.cliente_dni || r.cliente?.dni || '');
					if (!dni) return;
					if (Array.isArray(selected) && selected.length>0 && selected.indexOf(String(dni)) === -1) return;
					if (!map.has(dni)) map.set(dni, []);
					map.get(dni).push(r);
				});
				const labels = Array.from(map.keys()).map(dni => { const c = (cliList||[]).find(cc => String(cc.dni) === String(dni)); return c ? (c.nombre||dni) : dni; });
				const values = Array.from(map.values()).map(rs => rs.length);
				updateChart(labels, values, 'Reservas por cliente');
				const cards = Array.from(map.entries()).map(([dni, rs]) => ({ dni, cliente: (cliList||[]).find(cc=>String(cc.dni)===String(dni)) || null, reservas: rs }));
				setDisplayCards(cards);
				setSummaryText(`Total reservas en período: ${values.reduce((s,v)=>s+v,0)}`);
			}

			async function loadReservasPorCanchasPeriod() {
				try {
					const data = await reportesService.jsonReservasPorCanchas(desde, hasta, 1);
					setCanchaData(data || []);
					const total = (data||[]).reduce((s,it)=>(s + (it.reservas_count|| (it.reservas?it.reservas.length:0) )),0);
					setSummaryText(`Total reservas en período: ${total}`);
					const labels = (data||[]).map(it=> `Cancha ${it.cancha_id || it.id || ''}`);
					const values = (data||[]).map(it=> it.reservas_count || (it.reservas?it.reservas.length:0));
					updateChart(labels, values, 'Reservas por cancha');
				} catch (e) { console.error(e); alert('Error cargando reservas por cancha'); }
			}

			async function loadCanchasMasUtilizadas(limite=10) {
				try {
					const data = await reportesService.jsonCanchasMasUtilizadas(limite);
					setCanchaData(data || []);
					const labels = (data||[]).map(it=> `Cancha ${it.cancha_id}`);
					const values = (data||[]).map(it=> it.reservas_count||0);
					updateChart(labels, values, 'Canchas más utilizadas');
					setSummaryText('');
				} catch (e) { console.error(e); alert('Error cargando canchas más utilizadas'); }
			}

			useEffect(()=>{
				if (mode === 'por-clientes') loadReservasClientesInteractive();
				else if (mode === 'por-canchas') loadReservasPorCanchasPeriod();
				else if (mode === 'canchas-mas-utilizadas') loadCanchasMasUtilizadas();
				if (mode !== 'por-clientes') { setDisplayCards([]); setReservas([]); }
				if (mode !== 'por-canchas') setCanchaData([]);
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [mode]);

			function toggleClienteMenu(){ setClienteMenuOpen(v=>!v); }
			function onClientCheckboxChange(dni, checked) {
				const cur = selectedDnis ? new Set(selectedDnis) : new Set();
				if (checked) cur.add(String(dni)); else cur.delete(String(dni));
				const arr = Array.from(cur);
				setSelectedDnis(arr.length===0 ? null : arr);
			}

			function applyFilterClientes() {
				renderGrouped(selectedDnis, clientes, reservas);
				setClienteMenuOpen(false);
			}

			function clearResults() {
				setDisplayCards([]); setCanchaData([]); setSummaryText(''); if (chartInstance.current) { try{chartInstance.current.destroy(); }catch(e){} chartInstance.current = null; }
			}

			// Year modal handlers
			function openYearModal() { setYearInput(String(new Date().getFullYear())); setYearModalOpen(true); }
			function closeYearModal() { setYearModalOpen(false); }
			async function handleAcceptYear() {
				const y = (yearInput || '').toString().trim();
				if (!/^[0-9]{4}$/.test(y)) { alert('Ingresá un año válido (YYYY)'); return; }
				try {
					setMode('utilizacion-mensual');
					closeYearModal();
					const resp = await fetch(`${API_BASE}/reportes/json/utilizacion/${encodeURIComponent(y)}`);
					if (!resp.ok) throw new Error('Error server: ' + resp.status);
					const data = await resp.json();
					const counts = data.counts || data || [];
					setCanchaData((counts||[]).map((c,i)=>({month:i+1,count:c})));
					const labels = counts.map((_,i)=>['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]);
					updateChart(labels, counts, `Utilización ${y}`);
					setSummaryText(`Utilización mensual ${y}`);
				} catch (e) { console.error(e); alert('Error cargando utilización mensual'); }
			}

			return (
				<div className="reportes-page container py-3">
					<h2 className="tituloPagina mb-3">Reportes</h2>
					<div className="mb-3 d-flex gap-2">
						<button className={`btn btn-outline-info ${mode==='por-clientes'?'active':''}`} onClick={()=>setMode('por-clientes')}>Listado de reservas por cliente</button>
						<button className={`btn btn-outline-info ${mode==='canchas-mas-utilizadas'?'active':''}`} onClick={()=>setMode('canchas-mas-utilizadas')}>Canchas más utilizadas</button>
						<button className={`btn btn-outline-info`} onClick={openYearModal}>Utilización mensual de canchas</button>
						<button className={`btn btn-outline-info ${mode==='por-canchas'?'active':''}`} onClick={()=>setMode('por-canchas')}>Reservas por canchas en período</button>
					</div>

					<div className="card mb-3">
						<div className="card-body">
							<div className="row g-2 align-items-end">
								<div className="col-md-2">
									<label className="form-label">Desde</label>
									<input className="form-control" type="date" value={desde} onChange={e=>setDesde(e.target.value)} />
								</div>
								<div className="col-md-2">
									<label className="form-label">Hasta</label>
									<input className="form-control" type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
								</div>
								<div className="col-md-4">
									<label className="form-label">Cliente (puede seleccionar varios)</label>
									<div className="multiselect">
										<button type="button" className="btn btn-light form-control text-start" onClick={toggleClienteMenu}>{selectedDnis && selectedDnis.length>0 ? (selectedDnis.length===1 ? (clientes.find(c=>String(c.dni)===String(selectedDnis[0]))?.nombre || selectedDnis[0]) : `${selectedDnis.length} clientes seleccionados`) : '-- Todos los clientes --'}</button>
										<div className={`multiselect-menu ${clienteMenuOpen? '' : 'd-none'}`} style={{maxHeight:220, overflow:'auto', border:'1px solid #ddd', padding:8}}>
											{(clientes||[]).map(c=> (
												<label key={c.dni} style={{display:'block', padding:'4px 8px', cursor:'pointer'}}>
													<input type="checkbox" data-dni={c.dni} value={c.dni} checked={selectedDnis ? selectedDnis.indexOf(String(c.dni))!==-1 : false} onChange={(e)=>onClientCheckboxChange(c.dni, e.target.checked)} /> <span> {c.nombre || ''} ({c.dni})</span>
												</label>
											))}
										</div>
									</div>
								</div>
								<div className="col-md-4 d-flex gap-2">
									<button id="ri-filtrar" className="btn btn-primary" onClick={applyFilterClientes}>Filtrar</button>
									{mode === 'por-clientes' && (
										<button id="ri-export" className="btn btn-success" onClick={exportPdf}>Exportar PDF</button>
									)}
								</div>
							</div>
							<div className="mb-3 mt-3" style={{height:260}}>
								<canvas id="ri-chart" ref={chartRef} style={{width:'100%', height:'100%'}}></canvas>
							</div>
							<div id="ri-summary" className="mb-2"><strong>{summaryText}</strong></div>

							<div id="ri-results">
								{mode === 'por-canchas' && Array.isArray(canchaData) && canchaData.length>0 && (
									<div className="list-group">
										{canchaData.map((it, idx)=> (
											<div className="list-group-item" key={idx}>
												<div className="d-flex justify-content-between align-items-center">
													<div><strong>Cancha {it.cancha_id ?? it.id ?? ''}</strong>{it.tipo_nombre? ' — '+it.tipo_nombre : ''}</div>
													<div><span className="badge bg-primary me-2">{it.reservas_count ?? (it.reservas? it.reservas.length : 0)}</span></div>
												</div>
												<div style={{marginTop:8}}>
													<div style={{background:'#eee', height:12}}><div style={{background:'#4c72b0', height:'100%', width: `${Math.round(((it.reservas_count|| (it.reservas?it.reservas.length:0))/Math.max(...(canchaData.map(x=>x.reservas_count|| (x.reservas?x.reservas.length:0))||[1])))*100)}%`}}></div></div>
												</div>
												{it.reservas && it.reservas.length>0 && (
													<div style={{marginTop:8}}>
														<button className="btn btn-sm btn-outline-secondary" onClick={(e)=>{ const list = e.target.nextSibling; if (list) list.style.display = list.style.display==='none'?'block':'none'; e.target.textContent = e.target.textContent==='Ver reservas' ? 'Ocultar reservas' : 'Ver reservas'; }}>Ver reservas</button>
														<div style={{display:'none'}}>
															{it.reservas.map(r=> (
																<div key={r.id} className="p-2 mb-1" style={{borderTop:'1px solid #f0f0f0'}}># {r.id} — {r.fecha} — DNI {r.cliente_dni} — {(r.horarios||[]).map(h=>`${h.inicio}-${h.fin}`).join(', ')} — ${r.precio}</div>
															))}
														</div>
													</div>
												)}
											</div>
										))}
									</div>
								)}

								{mode === 'por-clientes' && displayCards.map(c => (
									<div className="card mb-3" key={c.dni}>
										<div className="card-body">
											<h5 className="card-title">{c.cliente ? c.cliente.nombre : 'DNI '+c.dni}</h5>
											<h6 className="card-subtitle mb-2 text-muted">DNI: {c.dni} — {c.reservas.length} reserva{c.reservas.length!==1?'s':''}</h6>
											{c.reservas.map(r => (
												<div key={r.id} className="mb-1">#{r.id} — Cancha {r.cancha_id || ''} — {r.fecha} — {(r.horarios||[]).map(h=>`${h.inicio}-${h.fin}`).join(', ')} — ${r.precio}</div>
											))}
										</div>
									</div>
								))}

								{mode === 'canchas-mas-utilizadas' && Array.isArray(canchaData) && canchaData.map((it, idx)=>(
									<div key={idx} className="list-group-item">Cancha {it.cancha_id} — <span className="badge bg-primary">{it.reservas_count}</span></div>
								))}

							</div>
						</div>
					</div>

					{yearModalOpen && (
						<div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1050}} onClick={closeYearModal}>
							<div onClick={e=>e.stopPropagation()} style={{width:360, maxWidth:'90%', background:'#fff', borderRadius:8, padding:16, boxShadow:'0 8px 20px rgba(0,0,0,0.2)'}}>
								<h5 style={{marginTop:0}}>Año (YYYY) para el reporte de utilización mensual</h5>
								<input type="number" min="1900" max="3000" value={yearInput} onChange={e=>setYearInput(e.target.value)} className="form-control" />
								<div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
									<button className="btn btn-light" onClick={closeYearModal}>Cancelar</button>
									<button className="btn btn-primary" onClick={handleAcceptYear}>Aceptar</button>
								</div>
							</div>
						</div>
					)}
				</div>
			);
		}

export { Reportes };