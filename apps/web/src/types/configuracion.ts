import type { CuerpoDe, RespuestaDe } from "@contrato";

import type { Afirmar, ListaCompleta } from "./contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type Configuracion = RespuestaDe<"get /api/configuracion">;
export type ConfiguracionPayload = CuerpoDe<"patch /api/configuracion">;
export type OpcionDevolucionStock = Configuracion["cancelarPedido"];

export const OPCIONES_DEVOLUCION_STOCK = ["PREGUNTAR", "DEVOLVER", "NO_DEVOLVER"] as const;
// No compila si la lista no tiene exactamente los valores del contrato.
export type OpcionesDevolucionCompletas = Afirmar<
  ListaCompleta<typeof OPCIONES_DEVOLUCION_STOCK, OpcionDevolucionStock>
>;
