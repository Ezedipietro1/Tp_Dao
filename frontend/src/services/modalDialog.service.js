let ModalDialog_Show = null;  //apunta a la funcion show del componente ModalDialog


const Alert = (
  _mensaje,
  _titulo = "Atención",
  _boton1 = "Aceptar",
  _boton2 = "",
  _accionBoton1 = null,
  _accionBoton2 = null,
  _tipo = 'info'
) => {
  if (ModalDialog_Show)
    ModalDialog_Show(
      _mensaje,
      _titulo,
      _boton1,
      _boton2,
      _accionBoton1,
      _accionBoton2,
      _tipo
    );
};


const Confirm = (
  _mensaje,
  _titulo = "Confirmar",
  _boton1 = "Aceptar",
  _boton2 = "Cancelar",
  _accionBoton1 = null,
  _accionBoton2 = null,
  _tipo = 'warning'
) => {
  if (ModalDialog_Show)
    ModalDialog_Show(
      _mensaje,
      _titulo,
      _boton1,
      _boton2,
      _accionBoton1,
      _accionBoton2,
      _tipo
    );
};


let cntBloquearPantalla = 0;
const BloquearPantalla = (blnBloquear) => {
  if (blnBloquear) {
    cntBloquearPantalla++;
  } else {
    cntBloquearPantalla--;
  }
  if (ModalDialog_Show) {
    if (cntBloquearPantalla === 1) {
      ModalDialog_Show(
        "BloquearPantalla",
        "Espere por favor...",
        "",
        "",
        null,
        null,
        'info'
      );
    }
    if (cntBloquearPantalla === 0) {
      ModalDialog_Show("", "", "", "", null, null);
    }
  }
};


const subscribeShow = (_ModalDialog_Show) => {
  ModalDialog_Show = _ModalDialog_Show;
};


const modalDialogService = { Alert, Confirm, BloquearPantalla, subscribeShow };


export default modalDialogService;

// Special modal helper for payments. Call like:
// modalDialogService.ShowPayment(reserva, onConfirm(method), onCancel)
export function ShowPayment(reserva, onConfirm, onCancel) {
  if (ModalDialog_Show) {
    // _mensaje can be an object that ModalDialog will interpret specially
    ModalDialog_Show({ type: 'payment', reserva }, 'Pagar reserva', 'Pagar', 'Cancelar', onConfirm, onCancel, 'warning');
  } else {
    // fallback: modal not mounted — choose default method silently (efectivo)
    try {
      if (onConfirm) onConfirm('efectivo');
    } catch (e) {
      if (onCancel) onCancel();
    }
  }
}
