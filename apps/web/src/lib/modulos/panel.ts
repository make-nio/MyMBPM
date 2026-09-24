import { pedirApi } from "../api";

export function obtenerResumenPanel(limite = 5) {
  return pedirApi("get /api/panel/resumen", { consulta: { limite } });
}

export function obtenerAvisos() {
  return pedirApi("get /api/panel/avisos");
}
