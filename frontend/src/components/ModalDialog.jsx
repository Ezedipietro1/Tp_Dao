import React, { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import modalDialogService from "../services/modalDialog.service";


function ModalDialog() {
  const [mensaje, setMensaje] = useState("");
  const [titulo, setTitulo] = useState("");
  const [boton1, setBoton1] = useState("");
  const [boton2, setBoton2] = useState("");
  const [accionBoton1, setAccionBoton1] = useState(null);
  const [accionBoton2, setAccionBoton2] = useState(null);
  const [tipo, setTipo] = useState("");


  const handleAccionBoton1 = () => {
    if (accionBoton1) {
      // if mensaje is a payment object, pass selectedMethod (plus card data if tarjeta)
      try {
        if (mensaje && typeof mensaje === 'object' && mensaje.type === 'payment') {
          if (selectedMethod === 'tarjeta') {
            const v = validateCardExpiry(cardExpiry);
            if (!v.ok) {
              try { modalDialogService.Alert(v.msg, 'Atención', 'Aceptar', '', null, null, 'warning'); } catch (e) { alert(v.msg); }
              return;
            }
            accionBoton1({ method: 'tarjeta', card: { number: cardNumber, cvv: cardCVV, expiry: cardExpiry } });
          } else {
            accionBoton1('efectivo');
          }
        } else {
          accionBoton1();
        }
      } catch (e) {
        try { accionBoton1(); } catch (err) {}
      }
    }
    setMensaje((x) => (x = ""));
  };
  const handleAccionBoton2 = () => {
    if (accionBoton2) {
      try {
        if (mensaje && typeof mensaje === 'object' && mensaje.type === 'payment') {
          if (selectedMethod === 'tarjeta') {
            const v = validateCardExpiry(cardExpiry);
            if (!v.ok) {
              try { modalDialogService.Alert(v.msg, 'Atención', 'Aceptar', '', null, null, 'warning'); } catch (e) { alert(v.msg); }
              return;
            }
            accionBoton2({ method: 'tarjeta', card: { number: cardNumber, cvv: cardCVV, expiry: cardExpiry } });
          } else {
            accionBoton2('efectivo');
          }
        } else {
          accionBoton2();
        }
      } catch (e) {
        try { accionBoton2(); } catch (err) {}
      }
    }
    setMensaje((x) => (x = ""));
  };


  const handleClose = () => {
    setMensaje((x) => (x = ""));
  };

  // local state for payment modal selection
  const [selectedMethod, setSelectedMethod] = useState('efectivo');
  // card details state (only used when tarjeta selected)
  const [cardNumber, setCardNumber] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');

  // validate expiry MM/AA and that date is after current month
  function validateCardExpiry(expiry) {
    if (!expiry || typeof expiry !== 'string') return { ok: false, msg: 'Expiración inválida' };
    const s = expiry.trim();
    // accept MM/AA or MMAA without slash
    const parts = s.indexOf('/') !== -1 ? s.split('/') : [s.slice(0,2), s.slice(2)];
    if (parts.length !== 2) return { ok: false, msg: 'Formato de expiración debe ser MM/AA' };
    const mm = parts[0].padStart(2, '0');
    const aa = parts[1].padStart(2, '0');
    if (!/^[0-9]{2}$/.test(mm) || !/^[0-9]{2}$/.test(aa)) return { ok: false, msg: 'Formato de expiración inválido' };
    const month = parseInt(mm, 10);
    const year2 = parseInt(aa, 10);
    if (isNaN(month) || month < 1 || month > 12) return { ok: false, msg: 'El mes debe estar entre 01 y 12' };
    // interpret year as 2000+yy
    const fullYear = 2000 + year2;
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-12
    // expiry must be strictly after current month/year
    if (fullYear < curYear) return { ok: false, msg: 'La tarjeta ya expiró' };
    if (fullYear === curYear && month <= curMonth) return { ok: false, msg: 'La fecha de expiración debe ser posterior al mes actual' };
    return { ok: true };
  }


  function Show(
    // cuidado en esta funcion cuando se invoca desde el servicio modalDialogService
    //   NO tiene las variables de state del componente, ej mensaje, titulo, boton1....
    //   pero SI a las funciones setMensaje, setTitulo, setBoton1....
    _mensaje,
    _titulo,
    _boton1,
    _boton2,
    _accionBoton1,
    _accionBoton2,
    _tipo
  ) {
    setMensaje((x) => (x = _mensaje));
    setTitulo((x) => (x = _titulo));
    setBoton1((x) => (x = _boton1));
    setBoton2((x) => (x = _boton2));
    setAccionBoton1(() => _accionBoton1);
    setAccionBoton2(() => _accionBoton2);
    setTipo((x) => (x = _tipo));
    try {
      if (_mensaje && typeof _mensaje === 'object' && _mensaje.type === 'payment') {
        setSelectedMethod('efectivo');
        setCardNumber('');
        setCardCVV('');
        setCardExpiry('');
      }
    } catch (e) {}
  }


  useEffect(() => {
    //suscribirse al servicio modalDialogService al iniciar el componente
    modalDialogService.subscribeShow(Show);
    return () => {
      //desuscribirse al servicio modalDialogService al desmontar el componente
      modalDialogService.subscribeShow(null);
    };
  }, []);


  let classHeader = "";
  let faIcon = "";
  switch (tipo) {
    case "success":
      classHeader = "bg-success";
      faIcon = "fa-regular fa-circle-check";
      break;
    case "danger":
      classHeader = "bg-danger";
      faIcon = "fa-solid fa-triangle-exclamation";
      break;
    case "info":
      classHeader = "bg-info";
      faIcon = "fa-solid fa-circle-info";
      break;
    case "warning":
      classHeader = "bg-warning";
      faIcon = "fa-solid fa-triangle-exclamation";
      break;
    default:
      classHeader = "bg-success";
      break;
  }

  if (mensaje === "") return null;


  return (
    <>
      <Modal
        show
        onHide={handleClose}
        backdrop="static"
        keyboard={mensaje === "BloquearPantalla" ? false : true}
      >
        <Modal.Header
          className={classHeader}
          closeButton={mensaje !== "BloquearPantalla"}
        >
          <Modal.Title>{titulo}</Modal.Title>
        </Modal.Header>


        <Modal.Body style={{ fontSize: "1.2em" }}>
          {mensaje === "BloquearPantalla" ? (
            <div className="progress">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                aria-valuenow="100"
                aria-valuemin="0"
                aria-valuemax="100"
                style={{ flex: 1 }}
              ></div>
            </div>
          ) : (
            // custom render when mensaje is an object
            (mensaje && typeof mensaje === 'object' && mensaje.type === 'payment') ? (
              <div>
                <h5>Reserva #{mensaje.reserva.id}</h5>
                <p><strong>Cancha:</strong> {mensaje.reserva.cancha_nombre}</p>
                <p><strong>Cliente:</strong> {mensaje.reserva.cliente_nombre ?? mensaje.reserva.cliente_dni}</p>
                <p><strong>Fecha:</strong> {mensaje.reserva.fecha}</p>
                <p><strong>Horarios:</strong> {(mensaje.reserva.horarios_label && mensaje.reserva.horarios_label.join(', ')) || ''}</p>
                <p><strong>Total:</strong> ${mensaje.reserva.precio}</p>
                <hr />
                <div className="form-check">
                  <input className="form-check-input" type="radio" name="payMethod" id="efectivo" value="efectivo" checked={selectedMethod==='efectivo'} onChange={()=>setSelectedMethod('efectivo')} />
                  <label className="form-check-label" htmlFor="efectivo">Efectivo</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" name="payMethod" id="tarjeta" value="tarjeta" checked={selectedMethod==='tarjeta'} onChange={()=>setSelectedMethod('tarjeta')} />
                  <label className="form-check-label" htmlFor="tarjeta">Tarjeta</label>
                </div>
                {selectedMethod === 'tarjeta' && (
                  <div className="mt-3">
                    <div className="mb-2">
                      <label className="form-label">Número de tarjeta</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cardNumber}
                        maxLength={19}
                        onChange={(e) => {
                          // keep only digits, limit to 16 digits, then format groups of 4
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const groups = digits.match(/.{1,4}/g);
                          setCardNumber(groups ? groups.join(' ') : digits);
                        }}
                        placeholder="0000 0000 0000 0000"
                      />
                    </div>
                    <div className="row">
                      <div className="col-6">
                        <label className="form-label">Expiración (MM/AA)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={cardExpiry}
                          maxLength={5}
                          onChange={(e) => {
                            // keep only digits, limit to 4 digits (MMYY), insert slash after 2
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                            const formatted = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
                            setCardExpiry(formatted);
                          }}
                          placeholder="MM/AA"
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label">CVV</label>
                        <input type="password" className="form-control" value={cardCVV} maxLength={4} onChange={(e)=>setCardCVV(e.target.value.replace(/[^0-9]/g, ''))} placeholder="123" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p>
                <i
                  style={{ fontSize: "1.6em", margin: "0.5em" }}
                  className={faIcon}
                ></i>
                {mensaje}
              </p>
            )
          )}
        </Modal.Body>


        <Modal.Footer>
          {boton1 !== "" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAccionBoton1}
            >
              {boton1}
            </button>
          )}
          {boton2 !== "" && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAccionBoton2}
            >
              {boton2}
            </button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}


export { ModalDialog};
