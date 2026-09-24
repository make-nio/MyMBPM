import { pedirApi } from "../api";
import { FilaImportacionCatalogo } from "../../types/importacion-catalogo";

// Solo administradores (la API responde 403 al resto).
export function previsualizarImportacionCatalogo(filas: FilaImportacionCatalogo[]) {
  return pedirApi("post /api/items-catalogo/importacion/previsualizar", { cuerpo: { filas } });
}

export function importarCatalogo(filas: FilaImportacionCatalogo[]) {
  return pedirApi("post /api/items-catalogo/importacion", { cuerpo: { filas } });
}
