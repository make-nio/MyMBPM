export const ESTADOS_SOLICITUD = [
  "PENDIENTE",
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
  "CONVERTIDA_A_PEDIDO"
] as const;

export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export type SolicitudEspecial = {
  idSolicitudEspecial: string;
  idCliente: string | null;
  nombreSolicitante: string;
  telefono: string | null;
  email: string | null;
  descripcion: string;
  estadoSolicitud: EstadoSolicitud;
  observaciones: string | null;
  fechaAlta: string;
  fechaModificacion: string;
  cliente?: {
    idCliente: string;
    nombre: string;
    apellido: string | null;
  } | null;
  // Pedido creado al convertirla (ver "Convertir en pedido").
  idPedido?: string | null;
  pedido?: { idPedido: string; numeroPedido: string | null } | null;
};

// Desde estos estados se puede convertir en pedido (igual que en la API).
export const ESTADOS_CONVERTIBLES: readonly EstadoSolicitud[] = ["PENDIENTE", "EN_REVISION", "APROBADA"];

export type SolicitudEspecialPayload = {
  idCliente?: string;
  nombreSolicitante: string;
  telefono?: string;
  email?: string;
  descripcion: string;
  estadoSolicitud?: EstadoSolicitud;
  observaciones?: string;
};
