import logo from '../assets/img/donbalon.png';

function Inicio() {
  const hours = Array.from({ length: 16 }, (_, i) => 8 + i); // 08..23
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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
            <div className="row">
              <div className="col-12 col-md-6">
                <div className="schedule-mock">
                  <h3 className="fw-bold mb-2">Horario (maqueta)</h3>
                  <div className="schedule-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}>
                    <table className="table schedule-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Hora</th>
                          {days.map(d => (
                            <th key={d}>{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hours.map(h => (
                          <tr key={h}>
                            <th style={{ textAlign: 'center' }}>{String(h).padStart(2, '0')}:00</th>
                            {days.map((d, di) => {
                              const booked = ((h + di) % 5) === 0;
                              return (
                                <td key={d} className={booked ? 'booked' : 'available'} style={{ textAlign: 'center' }}>
                                  {booked ? 'X' : 'Libre'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 mb-0 small text-muted">Esta es una maqueta para mostrar disponibilidad por franjas horarias.</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="map-container card h-100">
                  <div className="card-body p-0 h-100">
                    <iframe
                      title="Mapa Don Balon"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1703.564463843959!2d-64.23254906107205!3d-31.355421253082937!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9432994885a77b25%3A0xf0ffbb856aefbc90!2sComplejo%20de%20Canchas%20de%20F%C3%BAtbol%20Don%20Bal%C3%B3n%2C%20X5009%20C%C3%B3rdoba!5e0!3m2!1ses!2sar!4v1764269154566!5m2!1ses!2sar"
                      style={{ width: '100%', height: 420, border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="section-footer mt-2"><small>Ver mapa en Google Maps</small></footer>
      </section>
    </div>
  );
}

export { Inicio };
