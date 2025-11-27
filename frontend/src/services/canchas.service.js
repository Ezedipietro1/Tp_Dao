import axios from "axios";

const baseUrl = "http://127.0.0.1:5000";
const urlResource = baseUrl + "/canchas";

async function Buscar(filters) {
  const resp = await axios.get(urlResource, { params: filters });
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

async function Grabar(item, Func) {
  if (Func === "A") {
    await axios.post(urlResource, item);
  } else {
    const id = item?.id ?? item?.Id;
    await axios.put(`${urlResource}/${id}`, item);
  }
}

async function ListarTipos() {
  const resp = await axios.get(`${urlResource}/tipos`);
  return resp.data;
}

async function ListarServicios() {
  const resp = await axios.get(`${urlResource}/servicios`);
  return resp.data;
}

export const canchasService = {
  Buscar,
  BuscarPorId,
  Eliminar,
  Grabar,
  ListarTipos,
  ListarServicios,
};
