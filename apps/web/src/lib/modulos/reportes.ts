import { pedirApi } from "../api";

// mes: "AAAA-MM". Solo administradores (la API responde 403 al resto).
export function obtenerVentasDelMes(mes?: string) {
  return pedirApi("get /api/reportes/ventas-mes", { consulta: { mes } });
}

// Vendido por mes de los ultimos 12 meses (grafico de Reportes). Solo administradores.
export function obtenerVentasPorMes() {
  return pedirApi("get /api/reportes/ventas-por-mes");
}
