import { pedirApi } from "../api";
import { FilaImportacionCliente } from "../../types/importacion-clientes";

// Solo administradores (la API responde 403 al resto).
export function previsualizarImportacionClientes(filas: FilaImportacionCliente[]) {
  return pedirApi("post /api/clientes/importacion/previsualizar", { cuerpo: { filas } });
}

export function importarClientes(filas: FilaImportacionCliente[]) {
  return pedirApi("post /api/clientes/importacion", { cuerpo: { filas } });
}
