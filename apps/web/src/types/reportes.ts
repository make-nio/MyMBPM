import type { RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano. Los
// decimales llegan como texto.
export type ReporteVentasMes = RespuestaDe<"get /api/reportes/ventas-mes">;
export type VentasTotales = ReporteVentasMes["totales"];
export type VentaPorItem = ReporteVentasMes["porItem"][number];
export type VentaPorCliente = ReporteVentasMes["porCliente"][number];

// GET /api/reportes/ventas-por-mes: vendido de los ultimos 12 meses, del mas viejo al actual.
export type ReporteVentasPorMes = RespuestaDe<"get /api/reportes/ventas-por-mes">;
export type VentaDelMes = ReporteVentasPorMes["meses"][number];
