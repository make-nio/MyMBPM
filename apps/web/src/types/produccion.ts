import type { RespuestaDe } from "@contrato";

import type { Afirmar, ListaCompleta } from "./contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
// El listado trae solo el nombre del producto de cada linea; el detalle, el item completo y los
// consumos de insumos.
export type OrdenProduccion = RespuestaDe<"get /api/produccion">[number];
export type OrdenProduccionCompleta = RespuestaDe<"get /api/produccion/{id}">;
export type OrdenProduccionDetalle = OrdenProduccionCompleta["detalles"][number];
export type OrdenProduccionConsumo = OrdenProduccionCompleta["consumos"][number];

export type EstadoProduccion = OrdenProduccion["estadoProduccion"];
export const ESTADOS_PRODUCCION = ["PENDIENTE", "EN_PROCESO", "FINALIZADA", "CANCELADA"] as const;
// No compila si la lista no tiene exactamente los estados del contrato.
export type EstadosProduccionCompletos = Afirmar<ListaCompleta<typeof ESTADOS_PRODUCCION, EstadoProduccion>>;
