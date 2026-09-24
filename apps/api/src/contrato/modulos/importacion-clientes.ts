import { Endpoint, lista, objeto, z } from "../base";
import { importacionClientesSchema } from "../../modulos/importacion-clientes/importacion-clientes.schemas";

const etiqueta = "importacion-clientes";

// El cliente que se crearia desde una fila valida (validar-filas-clientes.ts). Los textos vacios
// quedan undefined y no viajan en el JSON: por eso son opcionales, no nullable.
const clienteImportableSchema = objeto({
  nombre: z.string(),
  apellido: z.string().optional(),
  documento: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
  instagram: z.string().optional(),
  domicilio: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  observaciones: z.string().optional(),
  activo: z.boolean()
});

const filaValidadaSchema = objeto({
  // La 1 es el encabezado: la primera fila de datos es la 2.
  numero: z.number().int(),
  errores: lista(z.string()),
  cliente: clienteImportableSchema.nullable()
});

const previsualizacionSchema = objeto({
  filas: lista(filaValidadaSchema),
  resumen: objeto({
    total: z.number().int(),
    validas: z.number().int(),
    conErrores: z.number().int()
  })
});

export const endpoints = [
  {
    metodo: "post",
    ruta: "/api/clientes/importacion/previsualizar",
    acceso: "administrador",
    resumen: "Valida las filas de un CSV de clientes y muestra los errores por fila, sin guardar nada (solo administradores)",
    etiqueta,
    body: importacionClientesSchema,
    respuesta: previsualizacionSchema
  },
  {
    metodo: "post",
    ruta: "/api/clientes/importacion",
    acceso: "administrador",
    resumen: "Importa los clientes de un CSV, todo o nada (solo administradores)",
    etiqueta,
    body: importacionClientesSchema,
    respuesta: objeto({ creados: z.number().int() }),
    status: 201
  }
] as const satisfies readonly Endpoint[];
