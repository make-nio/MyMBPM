import { apiFetch, buildQuery } from "../api";
import { ReporteVentasMes, ReporteVentasPorMes } from "../../types/reportes";

// mes: "AAAA-MM". Solo administradores (la API responde 403 al resto).
export function obtenerVentasDelMes(mes?: string) {
  return apiFetch<{ ok: true; data: ReporteVentasMes }>(`/api/reportes/ventas-mes${buildQuery({ mes })}`).then(
    (response) => response.data
  );
}

// Vendido por mes de los ultimos 12 meses (grafico de Reportes). Solo administradores.
export function obtenerVentasPorMes() {
  return apiFetch<{ ok: true; data: ReporteVentasPorMes }>("/api/reportes/ventas-por-mes").then(
    (response) => response.data
  );
}
