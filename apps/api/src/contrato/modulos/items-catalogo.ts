import { Endpoint, decimal, fecha, id, lista, objeto, z } from "../base";
import { TIPOS_ITEM } from "../../compartido/dominio/enums";
import {
  actualizarComponenteItemCatalogoSchema,
  actualizarEstadoItemCatalogoSchema,
  actualizarItemCatalogoSchema,
  crearComponenteItemCatalogoSchema,
  crearImagenAdicionalSchema,
  crearItemCatalogoSchema,
  listarItemsCatalogoQuerySchema
} from "../../modulos/items-catalogo/items-catalogo.schemas";

import { categoria } from "./categorias";

// Modelo ItemCatalogo de Prisma, sin relaciones. `costo` solo llega a quien puede verlo:
// ocultarCostosSinPermiso lo quita para quien no es administrador.
export const itemCatalogo = objeto({
  idItemCatalogo: id,
  idCategoria: id,
  tipoItem: z.enum(TIPOS_ITEM),
  nombre: z.string(),
  slug: z.string(),
  codigo: z.string().nullable(),
  descripcionCorta: z.string().nullable(),
  descripcionCompleta: z.string().nullable(),
  observacionesInternas: z.string().nullable(),
  precio: decimal.nullable(),
  costo: decimal.nullable().optional(),
  tipoMaterial: z.string().nullable(),
  color: z.string().nullable(),
  imagenPrincipal: z.string().nullable(),
  stockMinimo: z.number().int(),
  activo: z.boolean(),
  publico: z.boolean(),
  fechaAlta: fecha,
  fechaModificacion: fecha
}).openapi("ItemCatalogo");

export const itemCatalogoImagen = objeto({
  idItemCatalogoImagen: id,
  idItemCatalogo: id,
  urlImagen: z.string(),
  orden: z.number().int(),
  activo: z.boolean(),
  fechaAlta: fecha
}).openapi("ItemCatalogoImagen");

// Componente de la receta de un item, con el item hijo (relacion itemCatalogoComponente).
export const itemCatalogoComponente = objeto({
  idItemCatalogoComponente: id,
  idItemCatalogoPadre: id,
  idItemCatalogoHijo: id,
  cantidadRequerida: decimal,
  unidadMedida: z.string(),
  activo: z.boolean(),
  fechaAlta: fecha,
  fechaModificacion: fecha,
  itemCatalogoComponente: itemCatalogo
}).openapi("ItemCatalogoComponente");

// Cada operacion del repository incluye relaciones distintas:
// listar -> categoria + imagenes activas; crear -> categoria; actualizar -> categoria + imagenes;
// obtenerPorId -> categoria + componentesComoPadre + imagenes.
const itemConCategoria = itemCatalogo.extend({ categoria });
const itemConCategoriaEImagenes = itemConCategoria.extend({ imagenes: lista(itemCatalogoImagen) });
const itemDetalle = itemConCategoriaEImagenes.extend({ componentesComoPadre: lista(itemCatalogoComponente) });

const eliminado = objeto({ eliminado: z.literal(true) });

const params = objeto({ id });
const paramsComponente = objeto({ id, componenteId: id });
const paramsImagen = objeto({ id, imagenId: id });

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/items-catalogo",
    acceso: "autenticado",
    resumen: "Lista los items del catalogo, con su categoria y sus imagenes activas",
    etiqueta: "items-catalogo",
    query: listarItemsCatalogoQuerySchema,
    respuesta: lista(itemConCategoriaEImagenes)
  },
  {
    metodo: "get",
    ruta: "/api/items-catalogo/{id}",
    acceso: "autenticado",
    resumen: "Obtiene un item con su categoria, sus componentes y todas sus imagenes",
    etiqueta: "items-catalogo",
    params,
    respuesta: itemDetalle
  },
  {
    metodo: "post",
    ruta: "/api/items-catalogo",
    acceso: "autenticado",
    resumen: "Crea un item del catalogo (el costo solo lo carga un administrador)",
    etiqueta: "items-catalogo",
    body: crearItemCatalogoSchema,
    respuesta: itemConCategoria,
    status: 201
  },
  {
    metodo: "patch",
    ruta: "/api/items-catalogo/{id}",
    acceso: "autenticado",
    resumen: "Edita un item del catalogo (el costo solo lo cambia un administrador)",
    etiqueta: "items-catalogo",
    params,
    body: actualizarItemCatalogoSchema,
    respuesta: itemConCategoriaEImagenes
  },
  {
    metodo: "patch",
    ruta: "/api/items-catalogo/{id}/estado",
    acceso: "autenticado",
    resumen: "Activa o desactiva un item del catalogo",
    etiqueta: "items-catalogo",
    params,
    body: actualizarEstadoItemCatalogoSchema,
    respuesta: itemConCategoriaEImagenes
  },
  {
    metodo: "get",
    ruta: "/api/items-catalogo/{id}/componentes",
    acceso: "autenticado",
    resumen: "Lista los componentes de un item, con el item de cada componente",
    etiqueta: "items-catalogo",
    params,
    respuesta: lista(itemCatalogoComponente)
  },
  {
    metodo: "post",
    ruta: "/api/items-catalogo/{id}/componentes",
    acceso: "autenticado",
    resumen: "Agrega un componente a un item",
    etiqueta: "items-catalogo",
    params,
    body: crearComponenteItemCatalogoSchema,
    respuesta: itemCatalogoComponente,
    status: 201
  },
  {
    metodo: "patch",
    ruta: "/api/items-catalogo/{id}/componentes/{componenteId}",
    acceso: "autenticado",
    resumen: "Edita un componente de un item",
    etiqueta: "items-catalogo",
    params: paramsComponente,
    body: actualizarComponenteItemCatalogoSchema,
    respuesta: itemCatalogoComponente
  },
  {
    metodo: "delete",
    ruta: "/api/items-catalogo/{id}/componentes/{componenteId}",
    acceso: "autenticado",
    resumen: "Quita un componente de un item",
    etiqueta: "items-catalogo",
    params: paramsComponente,
    respuesta: eliminado
  },
  {
    metodo: "post",
    ruta: "/api/items-catalogo/{id}/imagenes",
    acceso: "autenticado",
    resumen: "Agrega una imagen adicional a un item",
    etiqueta: "items-catalogo",
    params,
    body: crearImagenAdicionalSchema,
    respuesta: itemCatalogoImagen,
    status: 201
  },
  {
    metodo: "delete",
    ruta: "/api/items-catalogo/{id}/imagenes/{imagenId}",
    acceso: "autenticado",
    resumen: "Elimina una imagen adicional de un item",
    etiqueta: "items-catalogo",
    params: paramsImagen,
    respuesta: eliminado
  }
] as const satisfies readonly Endpoint[];
