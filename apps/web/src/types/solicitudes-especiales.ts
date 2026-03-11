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
};

export type SolicitudEspecialPayload = {
  idCliente?: string;
  nombreSolicitante: string;
  telefono?: string;
  email?: string;
  descripcion: string;
  estadoSolicitud?: EstadoSolicitud;
  observaciones?: string;
};
