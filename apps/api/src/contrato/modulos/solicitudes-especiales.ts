import { Endpoint, fecha, id, lista, objeto, z } from "../base";
import { ESTADOS_SOLICITUD } from "../../compartido/dominio/enums";
import {
  actualizarEstadoSolicitudEspecialSchema,
  actualizarSolicitudEspecialSchema,
  crearSolicitudEspecialSchema,
  listarSolicitudesEspecialesQuerySchema
} from "../../modulos/solicitudes-especiales/solicitudes-especiales.schemas";
import { clienteSchema } from "./clientes";

const etiqueta = "solicitudes-especiales";

// Una solicitud con su cliente (entero, si tiene) y el pedido en que se convirtio (si se
// convirtio): include de solicitudes-especiales.repository.
const solicitudEspecialSchema = objeto({
  idSolicitudEspecial: id,
  idCliente: id.nullable(),
  nombreSolicitante: z.string(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
  descripcion: z.string(),
  estadoSolicitud: z.enum(ESTADOS_SOLICITUD),
  observaciones: z.string().nullable(),
  idPedido: id.nullable(),
  fechaAlta: fecha,
  fechaModificacion: fecha,
  cliente: clienteSchema.nullable(),
  pedido: objeto({ idPedido: id, numeroPedido: z.string().nullable() }).nullable()
}).openapi("SolicitudEspecial");

const params = objeto({ id });

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/solicitudes-especiales",
    acceso: "autenticado",
    resumen: "Lista solicitudes especiales, paginado, filtrando por cliente y estado",
    etiqueta,
    query: listarSolicitudesEspecialesQuerySchema,
    respuesta: lista(solicitudEspecialSchema)
  },
  {
    metodo: "get",
    ruta: "/api/solicitudes-especiales/{id}",
    acceso: "autenticado",
    resumen: "Obtiene una solicitud especial",
    etiqueta,
    params,
    respuesta: solicitudEspecialSchema
  },
  {
    metodo: "post",
    ruta: "/api/solicitudes-especiales",
    acceso: "autenticado",
    resumen: "Registra una solicitud especial (un pedido a medida)",
    etiqueta,
    body: crearSolicitudEspecialSchema,
    respuesta: solicitudEspecialSchema,
    status: 201
  },
  {
    metodo: "patch",
    ruta: "/api/solicitudes-especiales/{id}",
    acceso: "autenticado",
    resumen: "Modifica una solicitud especial",
    etiqueta,
    params,
    // El refine (al menos un campo) no se ve en el OpenAPI: la API lo sigue aplicando.
    body: actualizarSolicitudEspecialSchema,
    respuesta: solicitudEspecialSchema
  },
  {
    metodo: "patch",
    ruta: "/api/solicitudes-especiales/{id}/estado",
    acceso: "autenticado",
    resumen: "Cambia el estado de una solicitud que todavia no se convirtio en pedido",
    etiqueta,
    params,
    body: actualizarEstadoSolicitudEspecialSchema,
    respuesta: solicitudEspecialSchema
  },
  {
    metodo: "post",
    ruta: "/api/solicitudes-especiales/{id}/convertir",
    acceso: "autenticado",
    resumen: "Convierte la solicitud en un pedido pendiente para su cliente y la vincula",
    etiqueta,
    params,
    respuesta: objeto({ idPedido: id, numeroPedido: z.string().nullable() }),
    status: 201
  }
] as const satisfies readonly Endpoint[];
