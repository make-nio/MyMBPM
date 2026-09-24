import { apiFetch, buildQuery } from "../api";
import { ReporteVentasMes } from "../../types/reportes";

// mes: "AAAA-MM". Solo administradores (la API responde 403 al resto).
export function obtenerVentasDelMes(mes?: string) {
  return apiFetch<{ ok: true; data: ReporteVentasMes }>(`/api/reportes/ventas-mes${buildQuery({ mes })}`).then(
    (response) => response.data
  );
}
