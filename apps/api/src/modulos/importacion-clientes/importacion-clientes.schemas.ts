import { z } from "zod";

export const MAXIMO_FILAS_IMPORTACION_CLIENTES = 1000;

// Cada fila llega como la leyo la web del CSV: textos, sin convertir. La validacion la hace
// validarFilasClientes, fila por fila.
const celda = z.string().max(5000).optional();

export const filaImportacionClienteSchema = z.object({
  nombre: celda,
  apellido: celda,
  documento: celda,
  telefono: celda,
  email: celda,
  instagram: celda,
  domicilio: celda,
  localidad: celda,
  provincia: celda,
  observaciones: celda,
  activo: celda
});

export const importacionClientesSchema = z.object({
  filas: z
    .array(filaImportacionClienteSchema)
    .min(1, "El archivo no tiene filas")
    .max(MAXIMO_FILAS_IMPORTACION_CLIENTES, `Se importan hasta ${MAXIMO_FILAS_IMPORTACION_CLIENTES} filas por archivo`)
});

export type FilaImportacionCliente = z.infer<typeof filaImportacionClienteSchema>;
