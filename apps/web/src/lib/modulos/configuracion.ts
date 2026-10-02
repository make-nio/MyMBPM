import { pedirApi } from "../api";
import { ConfiguracionPayload } from "../../types/configuracion";

export function obtenerConfiguracion() {
  return pedirApi("get /api/configuracion");
}

export function actualizarConfiguracion(payload: ConfiguracionPayload) {
  return pedirApi("patch /api/configuracion", { cuerpo: payload });
}
