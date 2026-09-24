import { Endpoint, fecha, id, lista, objeto, z } from "../base";
import { ESTADOS_SOLICITUD } from "../../compartido/dominio/enums";
import { actualizarEstadoSolicitudEspecialSchema } from "../../modulos/solicitudes-especiales/solicitudes-especiales.schemas";
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

// Para la doc: los schemas de solicitudes-especiales.schemas.ts usan z.coerce.bigint (idSchema)
// para idCliente, que zod-to-openapi no soporta. Estos son equivalentes: mismos campos y reglas.
const idTexto = z.string().regex(/^\d+$/);

const listarQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  idCliente: idTexto.optional(),
  estadoSolicitud: z.enum(ESTADOS_SOLICITUD).optional()
});

const crearBody = z.object({
  idCliente: idTexto.optional(),
  nombreSolicitante: z.string().min(1).max(150),
  telefono: z.string().max(50).optional(),
  email: z.string().email().max(150).optional(),
  descripcion: z.string().min(1).max(4000),
  // CONVERTIDA_A_PEDIDO se rechaza: solo se alcanza con /convertir.
  estadoSolicitud: z.enum(ESTADOS_SOLICITUD).optional(),
  observaciones: z.string().max(2000).optional()
});

// Al menos un campo.
const actualizarBody = crearBody.partial();

const params = objeto({ id });

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/solicitudes-especiales",
    acceso: "autenticado",
    resumen: "Lista solicitudes especiales, paginado, filtrando por cliente y estado",
    etiqueta,
    query: listarQuery,
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
    body: crearBody,
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
    body: actualizarBody,
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
