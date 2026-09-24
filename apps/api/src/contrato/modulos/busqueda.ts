import { Endpoint, decimal, fecha, id, lista, objeto, z } from "../base";
import { ESTADOS_PEDIDO, TIPOS_ITEM } from "../../compartido/dominio/enums";
import { buscarQuerySchema } from "../../modulos/busqueda/busqueda.schemas";

// Selects de busqueda.repository.ts (los items los rearma busquedaService.buscar).
const resultadoPedido = objeto({
  idPedido: id,
  numeroPedido: z.string().nullable(),
  estadoPedido: z.enum(ESTADOS_PEDIDO),
  total: decimal,
  fechaAlta: fecha,
  cliente: objeto({
    nombre: z.string(),
    apellido: z.string().nullable()
  })
});

const resultadoCliente = objeto({
  idCliente: id,
  nombre: z.string(),
  apellido: z.string().nullable(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
  activo: z.boolean()
});

const resultadoItem = objeto({
  idItemCatalogo: id,
  nombre: z.string(),
  tipoItem: z.enum(TIPOS_ITEM),
  precio: decimal.nullable(),
  activo: z.boolean(),
  // Nombre de la categoria (no el objeto).
  categoria: z.string(),
  // Solo para quien puede ver costos (el service no lo agrega y el middleware lo quitaria).
  costo: decimal.nullable().optional()
});

export const endpoints: Endpoint[] = [
  {
    metodo: "get",
    ruta: "/api/busqueda",
    resumen: "Busqueda global (Ctrl+K): hasta 5 pedidos, clientes e items que coinciden con el texto",
    etiqueta: "busqueda",
    query: buscarQuerySchema,
    respuesta: objeto({
      pedidos: lista(resultadoPedido),
      clientes: lista(resultadoCliente),
      items: lista(resultadoItem)
    })
  }
];
