import { apiFetch } from "../api";
import {
  FilaImportacionCliente,
  PrevisualizacionClientes,
  ResultadoImportacionClientes
} from "../../types/importacion-clientes";

// Solo administradores (la API responde 403 al resto).
export function previsualizarImportacionClientes(filas: FilaImportacionCliente[]) {
  return apiFetch<{ ok: true; data: PrevisualizacionClientes }>("/api/clientes/importacion/previsualizar", {
    method: "POST",
    body: JSON.stringify({ filas })
  }).then((respuesta) => respuesta.data);
}

export function importarClientes(filas: FilaImportacionCliente[]) {
  return apiFetch<{ ok: true; data: ResultadoImportacionClientes }>("/api/clientes/importacion", {
    method: "POST",
    body: JSON.stringify({ filas })
  }).then((respuesta) => respuesta.data);
}
