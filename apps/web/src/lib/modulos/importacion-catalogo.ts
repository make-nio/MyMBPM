import { apiFetch } from "../api";
import {
  FilaImportacionCatalogo,
  PrevisualizacionCatalogo,
  ResultadoImportacionCatalogo
} from "../../types/importacion-catalogo";

// Solo administradores (la API responde 403 al resto).
export function previsualizarImportacionCatalogo(filas: FilaImportacionCatalogo[]) {
  return apiFetch<{ ok: true; data: PrevisualizacionCatalogo }>("/api/items-catalogo/importacion/previsualizar", {
    method: "POST",
    body: JSON.stringify({ filas })
  }).then((respuesta) => respuesta.data);
}

export function importarCatalogo(filas: FilaImportacionCatalogo[]) {
  return apiFetch<{ ok: true; data: ResultadoImportacionCatalogo }>("/api/items-catalogo/importacion", {
    method: "POST",
    body: JSON.stringify({ filas })
  }).then((respuesta) => respuesta.data);
}
