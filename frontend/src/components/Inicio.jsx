import React, { useEffect, useState } from 'react';
import logo from '../assets/img/donbalon.png';
import Carousel from 'react-bootstrap/Carousel';
import { canchasService } from '../services/canchas.service';
import { reservasService } from '../services/reservas.service';

function Inicio() {
  const hours = Array.from({ length: 16 }, (_, i) => 8 + i); // 08..23
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Timeline data (populated from API). If API fails, fallback to an empty list.
  const [timelineCanchas, setTimelineCanchas] = useState([]);
  const minHour = hours[0];
  const maxHour = hours[hours.length - 1] + 1;
  const hourRange = maxHour - minHour;

  useEffect(() => {
    // build timeline for today's reservations and canchas
    async function loadTimeline() {
      try {
        const now = new Date();
        const todayIso = now.toISOString().slice(0,10);
        const currentHour = now.getHours() + now.getMinutes()/60;

        const [canchas, reservas] = await Promise.all([
          canchasService.Buscar(),
          reservasService.Buscar({ fecha: todayIso })
        ]);

        // fetch detailed cancha info (to get servicios) in parallel and index by id
        let canchaDetalles = [];
        let detallesById = {};
        try {
          canchaDetalles = await Promise.all((canchas || []).map(c => {
            const cid = c.id || c.cancha_id || c._id || c.Id;
            // BuscarPorId expects an object with id property
            return canchasService.BuscarPorId({ id: cid }).catch(err => null);
          }));
          canchaDetalles.forEach(d => {
            if (d && (d.id || d.cancha_id)) {
              const did = d.id || d.cancha_id;
              detallesById[did] = d;
            }
          });
        } catch (e) {
          canchaDetalles = [];
          detallesById = {};
        }

        // group reservas by cancha_id
        const byCancha = {};
        (reservas || []).forEach(r => {
          const cid = r.cancha_id || r.canchaId || r.cancha?.id;
          if (!cid) return;
          if (!byCancha[cid]) byCancha[cid] = [];
          (r.horarios || []).forEach(h => {
            // horario.inicio could be 'HH:MM' or ISO; handle both
            let inicio = h.inicio || h.inicio;
            let fin = h.fin || h.fin;
            try {
              if (String(inicio).indexOf('T') !== -1) inicio = new Date(inicio).getHours() + new Date(inicio).getMinutes()/60;
              else if (String(inicio).indexOf(':') !== -1) {
                const p = String(inicio).split(':'); inicio = parseInt(p[0],10) + (parseInt(p[1]||'0',10)/60);
              } else inicio = parseFloat(inicio) || 0;
            } catch(e) { inicio = 0; }
            try {
              if (String(fin).indexOf('T') !== -1) fin = new Date(fin).getHours() + new Date(fin).getMinutes()/60;
              else if (String(fin).indexOf(':') !== -1) {
                const p = String(fin).split(':'); fin = parseInt(p[0],10) + (parseInt(p[1]||'0',10)/60);
              } else fin = parseFloat(fin) || 0;
            } catch(e) { fin = inicio + 1; }

            // Only include future events (end after current time)
            if (fin <= currentHour) return;
            // clip start to current time so bar shows remaining part
            if (inicio < currentHour) inicio = currentHour;

            byCancha[cid].push({ start: inicio, end: fin });
          });
        });

        // Build timeline entries for ALL canchas; events may be empty array
        const timeline = (canchas || []).map((c) => {
          const cid = c.id || c.cancha_id || c._id || c.Id;
          const name = c.nombre || c.name || `Cancha ${cid}`;
          // prefer tipo from detailed payload if available (lookup by id)
          const detalle = detallesById[cid] || null;
          const tipo = (detalle && detalle.tipo_cancha) || c.tipo_cancha || c.tipo_nombre || c.tipo || '';
          // servicios may be present in detalle.servicios or in c.servicios
          const serviciosRaw = (detalle && detalle.servicios) || c.servicios || c.descripcion || [];
          let serviciosStr = '';
          if (Array.isArray(serviciosRaw)) {
            try {
              serviciosStr = serviciosRaw.map(s => (s && (s.nombre || s.name)) ? (s.nombre || s.name) : String(s)).filter(Boolean).join(', ');
            } catch (e) {
              serviciosStr = String(serviciosRaw);
            }
          } else if (typeof serviciosRaw === 'string') {
            serviciosStr = serviciosRaw;
          } else if (serviciosRaw) {
            serviciosStr = String(serviciosRaw);
          }

          // If the cancha name already contains the tipo (e.g. "Fútbol 5 #1"), avoid repeating it below
          const nameLower = String(name || '').toLowerCase();
          const tipoLower = String(tipo || '').toLowerCase();
          let desc = '';
          if (serviciosStr) {
            // show services; prefix with tipo only when name doesn't already include it
            desc = (tipo && nameLower.indexOf(tipoLower) === -1) ? `${tipo} | ${serviciosStr}` : serviciosStr;
          } else {
            // no services: show tipo only if it's informative and not repeated in name
            desc = (tipo && nameLower.indexOf(tipoLower) === -1) ? tipo : 'Sin servicios registrados';
          }
          const events = (byCancha[cid] || []);
          return { name, desc: desc || 'Sin servicios registrados', events };
        });

        setTimelineCanchas(timeline);
      } catch (e) {
        console.error('Error loading timeline', e);
        // leave timeline empty so UI shows no events instead of past ones
        setTimelineCanchas([]);
      }
    }

    loadTimeline();
  }, []);

  return (
    <div className="inicio-root">
      <section className="hero p-4 mb-4 d-flex align-items-center">
        <div className="logo-wrap me-3" aria-hidden="true">
          <img src={logo} alt="Don Balon" style={{ width: 200, height: 120, objectFit: 'contain' }} />
        </div>
        <div>
          <p className="lead subtitle mb-0">Gestión de canchas, reservas y pagos — simple y rápida.</p>
        </div>
      </section>

      <section className="section-block mb-3" id="about">
        <h2>Quiénes somos</h2>
        <div className="section-content">
          <p>
            Don Balon es una plataforma pensada para facilitar la administración de
            canchas, reservas y cobros. Nuestro objetivo es simplificar la gestión
            diaria de clubes y complejos deportivos con herramientas claras y acceso
            desde cualquier dispositivo.
          </p>
        </div>
      </section>

      <section className="section-block mb-3" id="location">
        <h2>Ubicación</h2>
        <div className="location-card card">
          <div className="card-body" style={{ padding: 12 }}>
            <div className="row g-4 align-items-stretch">
              <div className="col-12 col-md-6">
                <div className="card h-100 border-0 shadow-sm overflow-hidden">
                  <div className="card-body p-0" style={{height: 360}}>
                    {/* Carousel: carga dinámicamente todas las imágenes en src/assets/imgCarrusel */}
                    {(() => {
                      const modules = import.meta.glob('../assets/imgCarrusel/*.{png,jpg,jpeg,gif,webp}', { eager: true });
                      const imgs = Object.values(modules).map(m => m.default).sort();
                      if (!imgs || imgs.length === 0) {
                        return (
                          <div className="d-flex align-items-center justify-content-center h-100 text-muted" style={{border: '1px dashed #ccc'}}>
                            <small>Carrusel vacío — agrega imágenes en <code>src/assets/imgCarrusel/</code></small>
                          </div>
                        );
                      }

                      return (
                        <Carousel fade indicators={imgs.length > 1} controls={imgs.length > 1} className="h-100">
                          {imgs.map((src, i) => (
                            <Carousel.Item key={i} className="h-100">
                              <img
                                src={src}
                                className="d-block w-100"
                                alt={`slide-${i}`}
                                style={{objectFit: 'cover', height: '100%'}}
                              />
                            </Carousel.Item>
                          ))}
                        </Carousel>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="card h-100 border-0 shadow-sm overflow-hidden">
                  <div className="card-body p-0" style={{height: 360}}>
                    <iframe
                      title="Mapa Don Balon"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1703.564463843959!2d-64.23254906107205!3d-31.355421253082937!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9432994885a77b25%3A0xf0ffbb856aefbc90!2sComplejo%20de%20Canchas%20de%20F%C3%BAtbol%20Don%20Bal%C3%B3n%2C%20X5009%20C%C3%B3rdoba!5e0!3m2!1ses!2sar!4v1764269154566!5m2!1ses!2sar"
                      style={{ width: '100%', height: '100%', border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                  <div className="card-footer bg-transparent border-0 py-2 small text-muted">Ver mapa en Google Maps</div>
                </div>
              </div>
            </div>

            <div className="row mt-3">
              <div className="col-12">
                <div className="card schedule-card shadow-sm">
                  <div className="card-body p-2" style={{overflow: 'hidden'}}>
                    <h3 className="fw-bold mb-2">Horario </h3>

                    <div style={{fontSize: 14}}>
                      {/* header with hours */}
                      <div style={{display: 'flex', alignItems: 'center', marginBottom: 8}}>
                        <div style={{width: 220}} />
                        <div style={{flex: 1, display: 'flex'}}>
                          {hours.map(h => (
                            <div key={h} style={{flex: '1 0 0', textAlign: 'center', borderLeft: '1px solid #f0f0f0', padding: '6px 4px', color: '#444'}}>{String(h).padStart(2, '0')}</div>
                          ))}
                        </div>
                      </div>

                      {/* timeline rows */}
                      <div style={{maxHeight: 260, overflowY: 'auto'}}>
                        {timelineCanchas.map((c, idx) => (
                          <div key={c.name} style={{display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: idx===0? 'none':'1px solid #f1f1f1'}}>
                            <div style={{width: 220, paddingLeft: 8}}>
                              <div style={{fontWeight: 600}}>{c.name}</div>
                              <div style={{fontSize: 12, color: '#666'}}>{c.desc}</div>
                            </div>
                            <div style={{flex:1, position: 'relative', height: 44, background: '#fff'}}>
                              {/* grid background lines */}
                              <div style={{position: 'absolute', inset: 0, display: 'flex'}}>
                                {hours.map((h, i) => (
                                  <div key={i} style={{flex: '1 0 0', borderLeft: '1px solid #f7f7f7'}} />
                                ))}
                              </div>

                              {/* events */}
                              {c.events.map((ev, i) => {
                                const start = Math.max(ev.start, minHour);
                                const end = Math.min(ev.end, maxHour);
                                const leftPct = ((start - minHour) / hourRange) * 100;
                                const widthPct = ((end - start) / hourRange) * 100;
                                return (
                                  <div key={i} style={{position: 'absolute', left: `${leftPct}%`, top: 6, height: 'calc(100% - 12px)', width: `${widthPct}%`, background: '#6c7b8a', borderRadius: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13}}>
                                    <span style={{padding: '0 8px'}}>{`${String(Math.floor(ev.start)).padStart(2,'0')}:00 - ${String(Math.floor(ev.end)%24).padStart(2,'0')}:00`}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export { Inicio };
