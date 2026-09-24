import { Endpoint, lista, objeto, z } from "../base";
import { TIPOS_ITEM } from "../../compartido/dominio/enums";
import { importacionCatalogoSchema } from "../../modulos/importacion-catalogo/importacion-catalogo.schemas";

// ItemImportable (validar-filas.ts): lo arma el service, no sale de Prisma. Los numeros van como
// number y los opcionales vacios quedan undefined, asi que no viajan en el JSON.
const itemImportable = objeto({
  nombre: z.string(),
  slug: z.string(),
  tipoItem: z.enum(TIPOS_ITEM),
  categoria: z.string(),
  codigo: z.string().optional(),
  precio: z.number().optional(),
  // Ademas, ocultarCostosSinPermiso lo quitaria sin permiso (la ruta ya exige administrador).
  costo: z.number().optional(),
  stockMinimo: z.number().int(),
  tipoMaterial: z.string().optional(),
  color: z.string().optional(),
  descripcionCorta: z.string().optional(),
  activo: z.boolean()
});

const filaValidada = objeto({
  // Numero de fila del archivo: la 1 es el encabezado.
  numero: z.number().int(),
  errores: lista(z.string()),
  item: itemImportable.nullable()
});

const resumen = objeto({
  total: z.number().int(),
  validas: z.number().int(),
  conErrores: z.number().int(),
  categoriasNuevas: lista(z.string())
});

export const endpoints = [
  {
    metodo: "post",
    ruta: "/api/items-catalogo/importacion/previsualizar",
    acceso: "administrador",
    resumen: "Valida las filas de un CSV de catalogo sin crear nada (solo administradores)",
    etiqueta: "importacion-catalogo",
    body: importacionCatalogoSchema,
    respuesta: objeto({
      filas: lista(filaValidada),
      resumen
    })
  },
  {
    metodo: "post",
    ruta: "/api/items-catalogo/importacion",
    acceso: "administrador",
    resumen: "Importa el catalogo desde las filas de un CSV, todo o nada (solo administradores)",
    etiqueta: "importacion-catalogo",
    body: importacionCatalogoSchema,
    respuesta: objeto({
      creados: z.number().int(),
      categoriasCreadas: lista(z.string())
    }),
    status: 201
  }
] as const satisfies readonly Endpoint[];
