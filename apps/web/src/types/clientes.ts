export type Cliente = {
  idCliente: string;
  nombre: string;
  apellido: string | null;
  documento: string | null;
  telefono: string | null;
  email: string | null;
  instagram: string | null;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
  observaciones: string | null;
  activo: boolean;
  fechaAlta: string;
  fechaModificacion: string;
};

export type ClientePayload = {
  nombre: string;
  apellido?: string;
  documento?: string;
  telefono?: string;
  email?: string;
  instagram?: string;
  domicilio?: string;
  localidad?: string;
  provincia?: string;
  observaciones?: string;
  activo?: boolean;
};
