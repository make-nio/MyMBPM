import { z } from "zod";

export const MAXIMO_FILAS_IMPORTACION = 1000;

// Cada fila llega como la leyo la web del CSV: textos, sin convertir. La validacion y la
// conversion (numeros con coma, tipo, activo) las hace validarFilas, fila por fila.
const celda = z.string().max(5000).optional();

export const filaImportacionSchema = z.object({
  nombre: celda,
  tipo: celda,
  categoria: celda,
  codigo: celda,
  precio: celda,
  costo: celda,
  stockMinimo: celda,
  material: celda,
  color: celda,
  descripcionCorta: celda,
  activo: celda
});

export const importacionCatalogoSchema = z.object({
  filas: z
    .array(filaImportacionSchema)
    .min(1, "El archivo no tiene filas")
    .max(MAXIMO_FILAS_IMPORTACION, `Se importan hasta ${MAXIMO_FILAS_IMPORTACION} filas por archivo`)
});

export type FilaImportacion = z.infer<typeof filaImportacionSchema>;
