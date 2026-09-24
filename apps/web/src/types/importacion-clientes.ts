// Una fila del CSV como texto, sin convertir: la valida la API.
export type FilaImportacionCliente = Partial<
  Record<
    | "nombre"
    | "apellido"
    | "documento"
    | "telefono"
    | "email"
    | "instagram"
    | "domicilio"
    | "localidad"
    | "provincia"
    | "observaciones"
    | "activo",
    string
  >
>;

export type FilaValidadaCliente = {
  numero: number;
  errores: string[];
  cliente: { nombre: string; apellido?: string } | null;
};

export type PrevisualizacionClientes = {
  filas: FilaValidadaCliente[];
  resumen: { total: number; validas: number; conErrores: number };
};

export type ResultadoImportacionClientes = { creados: number };
