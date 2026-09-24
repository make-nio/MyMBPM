import { Endpoint, fecha, id, lista, objeto, z } from "../base";
import {
  actualizarCategoriaSchema,
  actualizarEstadoCategoriaSchema,
  crearCategoriaSchema,
  listarCategoriasQuerySchema
} from "../../modulos/categorias/categorias.schemas";

// Modelo Categoria de Prisma, sin relaciones.
export const categoria = objeto({
  idCategoria: id,
  nombre: z.string(),
  slug: z.string(),
  descripcion: z.string().nullable(),
  activo: z.boolean(),
  fechaAlta: fecha,
  fechaModificacion: fecha
}).openapi("Categoria");

const params = objeto({ id });

export const endpoints: Endpoint[] = [
  {
    metodo: "get",
    ruta: "/api/categorias",
    resumen: "Lista las categorias",
    etiqueta: "categorias",
    query: listarCategoriasQuerySchema,
    respuesta: lista(categoria)
  },
  {
    metodo: "get",
    ruta: "/api/categorias/{id}",
    resumen: "Obtiene una categoria",
    etiqueta: "categorias",
    params,
    respuesta: categoria
  },
  {
    metodo: "post",
    ruta: "/api/categorias",
    resumen: "Crea una categoria",
    etiqueta: "categorias",
    body: crearCategoriaSchema,
    respuesta: categoria,
    status: 201
  },
  {
    metodo: "patch",
    ruta: "/api/categorias/{id}",
    resumen: "Edita una categoria",
    etiqueta: "categorias",
    params,
    body: actualizarCategoriaSchema,
    respuesta: categoria
  },
  {
    metodo: "patch",
    ruta: "/api/categorias/{id}/estado",
    resumen: "Activa o desactiva una categoria",
    etiqueta: "categorias",
    params,
    body: actualizarEstadoCategoriaSchema,
    respuesta: categoria
  }
];
