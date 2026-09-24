import type { CuerpoDe, RespuestaDe } from "@contrato";

import type { Afirmar, ListaCompleta } from "./contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type SolicitudEspecial = RespuestaDe<"get /api/solicitudes-especiales/{id}">;
export type EstadoSolicitud = SolicitudEspecial["estadoSolicitud"];

export const ESTADOS_SOLICITUD = [
  "PENDIENTE",
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
  "CONVERTIDA_A_PEDIDO"
] as const;
// No compila si la lista no tiene exactamente los estados del contrato.
export type EstadosSolicitudCompletos = Afirmar<ListaCompleta<typeof ESTADOS_SOLICITUD, EstadoSolicitud>>;

// Desde estos estados se puede convertir en pedido (igual que en la API).
export const ESTADOS_CONVERTIBLES: readonly EstadoSolicitud[] = ["PENDIENTE", "EN_REVISION", "APROBADA"];

export type SolicitudEspecialPayload = CuerpoDe<"post /api/solicitudes-especiales">;
