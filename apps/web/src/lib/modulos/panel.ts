import { pedirApi } from "../api";

export function obtenerResumenPanel(limite = 5) {
  return pedirApi("get /api/panel/resumen", { consulta: { limite } });
}

// Resumen del dia (#101): lo arma el servidor; la pantalla no recalcula nada.
export function obtenerResumenDelDia() {
  return pedirApi("get /api/panel/hoy");
}

export function obtenerAvisos() {
  return pedirApi("get /api/panel/avisos");
}
