import axios from 'axios';

const baseUrl = 'http://127.0.0.1:5000';
const resource = baseUrl + '/torneos';

async function listar(){
  try {
    const resp = await axios.get(resource);
    return resp.data;
  } catch (e) {
    console.warn('torneos.listar failed, returning empty list', e);
    return [];
  }
}

async function crear(payload){
  const resp = await axios.post(resource, payload);
  return resp.data;
}

async function actualizar(id, payload){
  const resp = await axios.put(`${resource}/${id}`, payload);
  return resp.data;
}

async function obtener(id){
  const resp = await axios.get(`${resource}/${id}`);
  return resp.data;
}

async function eliminar(id){
  const resp = await axios.delete(`${resource}/${id}`);
  return resp.data;
}

async function syncReservas(id, payload){
  const resp = await axios.post(`${resource}/${id}/reservas-sync`, payload);
  return resp.data;
}

export const torneosService = { listar, crear, actualizar, obtener, eliminar, syncReservas };
