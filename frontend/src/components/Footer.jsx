import React from 'react';
import logo from '../assets/img/donbalon.png';

function Footer() {
  return (
    <footer className="app-footer border-top">
      <div className="container py-2 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-center gap-3 logo-contact">
          <div className="logo-footer">
            <img src={logo} alt="Don Balon" style={{ width: 140, height: 'auto', objectFit: 'contain' }} />
          </div>
          <div className="contact">
            <div><strong>Don Balon</strong></div>
            <div className="text">Contacto: <a href="mailto:contacto@donbalon.example">contacto@donbalon.example</a></div>
            <div className="text">Tel: <a href="tel:+549351000000">(351) 000-0000</a></div>
          </div>
        </div>

        <div className="social d-flex align-items-center gap-3">
          <a className="text" href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X">
            <i className="fab fa-twitter fa-lg"></i>
          </a>
          <a className="text" href="https://www.instagram.com/complejo_don_balon/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <i className="fab fa-instagram fa-lg"></i>
          </a>
          <a className="text" href="https://wa.me/" target="_blank" rel="noreferrer" aria-label="WhatsApp">
            <i className="fab fa-whatsapp fa-lg"></i>
          </a>
        </div>
      </div>
      <div className="container text-center text-muted small pb-2">© {new Date().getFullYear()} Don Balon — Todos los derechos reservados</div>
    </footer>
  );
}

export { Footer };
