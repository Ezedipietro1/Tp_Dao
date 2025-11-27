import axios from "axios";

const baseUrl = "http://127.0.0.1:5000";

async function getReservasPorCancha(canchaId, desde, hasta, options = { download: false }) {
  const resp = await axios.get(`${baseUrl}/reportes/reservas/cancha/${canchaId}`, {
    params: { desde, hasta, download: options.download ? 1 : 0 },
    responseType: 'arraybuffer'
  });
  return resp;
}

async function getReservasPorCliente(dni, options = { download: false }) {
  const resp = await axios.get(`${baseUrl}/reportes/reservas/cliente/${dni}`, {
    params: { download: options.download ? 1 : 0 },
    responseType: 'arraybuffer'
  });
  return resp;
}

async function jsonReservasPorCanchas(desde, hasta, include_details = false) {
  const resp = await axios.get(`${baseUrl}/reportes/json/reservas/por-canchas`, {
    params: { desde, hasta, include_details: include_details ? 1 : 0 }
  });
  return resp.data;
}

async function jsonCanchasMasUtilizadas(limite = 10) {
  const resp = await axios.get(`${baseUrl}/reportes/json/canchas/mas-utilizadas`, { params: { limite } });
  return resp.data;
}

export const reportesService = {
  getReservasPorCancha,
  getReservasPorCliente,
  jsonReservasPorCanchas,
  jsonCanchasMasUtilizadas,
};
