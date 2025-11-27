import axios from "axios";

const baseUrl = "http://127.0.0.1:5000";
const urlResource = baseUrl + "/clientes";

async function Buscar(params) {
  const resp = await axios.get(urlResource, { params });
  return resp.data;
}

async function BuscarPorId(item) {
  const dni = item?.dni ?? item?.DNI ?? item?.Id;
  const resp = await axios.get(`${urlResource}/${dni}`);
  return resp.data;
}

async function Eliminar(item) {
  const dni = item?.dni ?? item?.DNI ?? item?.Id;
  await axios.delete(`${urlResource}/${dni}`);
}

async function Grabar(item, Func) {
  if (Func === "A") {
    await axios.post(urlResource, item);
  } else {
    const dni = item?.dni ?? item?.DNI ?? item?.Id;
    await axios.put(`${urlResource}/${dni}`, item);
  }
}

export const clientesService = {
  Buscar,
  BuscarPorId,
  Eliminar,
  Grabar,
};
