import { Endpoint, decimal, fecha, id, lista, objeto, z } from "../base";
import {
  actualizarClienteSchema,
  actualizarEstadoClienteSchema,
  crearClienteSchema,
  listarClientesQuerySchema
} from "../../modulos/clientes/clientes.schemas";

const etiqueta = "clientes";

// Un cliente tal como sale de Prisma (modelo Cliente, sin relaciones). Lo reusan pedidos y
// solicitudes especiales, que lo incluyen entero (include: { cliente: true }).
export const clienteSchema = objeto({
  idCliente: id,
  nombre: z.string(),
  apellido: z.string().nullable(),
  documento: z.string().nullable(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
  instagram: z.string().nullable(),
  domicilio: z.string().nullable(),
  localidad: z.string().nullable(),
  provincia: z.string().nullable(),
  observaciones: z.string().nullable(),
  fechaAlta: fecha,
  activo: z.boolean(),
  fechaModificacion: fecha
}).openapi("Cliente");

// Lo que compro el cliente (pedidos activos, confirmados y no cancelados).
const resumenClienteSchema = objeto({
  totalComprado: decimal,
  pedidosComprados: z.number().int(),
  fechaUltimaCompra: fecha.nullable()
}).openapi("ResumenCliente");

const params = objeto({ id });

export const endpoints: Endpoint[] = [
  {
    metodo: "get",
    ruta: "/api/clientes",
    resumen: "Lista clientes, paginado, con busqueda por nombre, apellido, telefono, email o documento",
    etiqueta,
    query: listarClientesQuerySchema,
    respuesta: lista(clienteSchema)
  },
  {
    metodo: "get",
    ruta: "/api/clientes/{id}",
    resumen: "Obtiene un cliente",
    etiqueta,
    params,
    respuesta: clienteSchema
  },
  {
    metodo: "get",
    ruta: "/api/clientes/{id}/resumen",
    resumen: "Resumen de compras del cliente: total, cantidad de pedidos y ultima compra",
    etiqueta,
    params,
    respuesta: resumenClienteSchema
  },
  {
    metodo: "post",
    ruta: "/api/clientes",
    resumen: "Da de alta un cliente",
    etiqueta,
    body: crearClienteSchema,
    respuesta: clienteSchema,
    status: 201
  },
  {
    metodo: "patch",
    ruta: "/api/clientes/{id}",
    resumen: "Modifica los datos de un cliente",
    etiqueta,
    params,
    body: actualizarClienteSchema,
    respuesta: clienteSchema
  },
  {
    metodo: "patch",
    ruta: "/api/clientes/{id}/estado",
    resumen: "Activa o desactiva un cliente",
    etiqueta,
    params,
    body: actualizarEstadoClienteSchema,
    respuesta: clienteSchema
  }
];
