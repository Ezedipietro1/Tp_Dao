import axios from "axios";

const baseUrl = "http://127.0.0.1:5000";
const urlResource = baseUrl + "/reservas";

async function Buscar(params) {
  const resp = await axios.get(urlResource, { params });
  return resp.data;
}

async function BuscarPorId(item) {
  const id = item?.id ?? item?.Id;
  const resp = await axios.get(`${urlResource}/${id}`);
  return resp.data;
}

async function Eliminar(item) {
  const id = item?.id ?? item?.Id;
  await axios.delete(`${urlResource}/${id}`);
}

async function Grabar(item) {
  // POST /reservas expects payload with cancha_id, fecha, horario_ids or horario_id, precio, cliente_dni
  await axios.post(urlResource, item);
}

async function ListarHorariosDisponibles(params) {
  // params: { cancha_id: number, fecha: 'YYYY-MM-DD' }
  const resp = await axios.get(`${urlResource}/horarios`, { params });
  return resp.data;
}

export const reservasService = {
  Buscar,
  BuscarPorId,
  Eliminar,
  Grabar,
  ListarHorariosDisponibles
};
