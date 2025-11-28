import axios from "axios";

const baseUrl = "http://127.0.0.1:5000";
const urlResource = baseUrl + "/pagos";

async function RegistrarPago({ reserva_id, monto, metodo_pago_id = 1 }) {
  const payload = { reserva_id, monto, metodo_pago_id };
  const resp = await axios.post(urlResource, payload);
  return resp.data;
}

export const pagosService = {
  RegistrarPago,
};
