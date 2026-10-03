import { ESTADOS_COBRO, MEDIOS_PAGO } from "../../compartido/dominio/enums";
import { anularPagoSchema, registrarPagoSchema } from "../../modulos/pagos/pagos.schemas";
import { decimal, Endpoint, fecha, id, lista, objeto, z } from "../base";

const etiqueta = "pagos";

const usuarioResumido = objeto({ idUsuario: id, nombre: z.string(), apellido: z.string() });

// Modelo Pago con quien lo registro y quien lo anulo (solo nombre).
const pagoSchema = objeto({
  idPago: id,
  idPedido: id,
  fecha,
  monto: decimal,
  medioPago: z.enum(MEDIOS_PAGO),
  observaciones: z.string().nullable(),
  idUsuario: id.nullable(),
  fechaAlta: fecha,
  anulado: z.boolean(),
  fechaAnulacion: fecha.nullable(),
  motivoAnulacion: z.string().nullable(),
  idUsuarioAnulacion: id.nullable(),
  usuario: usuarioResumido.nullable(),
  usuarioAnulacion: usuarioResumido.nullable()
}).openapi("Pago");

// pagosService: los pagos del pedido con lo devuelto, lo cobrado neto (vigentes menos
// reintegros) y el saldo (total - devuelto - cobrado). Un reintegro es un pago con monto negativo.
export const pagosDelPedidoSchema = objeto({
  total: decimal,
  devuelto: decimal,
  cobrado: decimal,
  saldo: decimal,
  estadoCobro: z.enum(ESTADOS_COBRO),
  pagos: lista(pagoSchema)
}).openapi("PagosDelPedido");

const params = objeto({ id });

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/pedidos/{id}/pagos",
    acceso: "autenticado",
    resumen: "Pagos de un pedido, con lo cobrado y el saldo",
    etiqueta,
    params,
    respuesta: pagosDelPedidoSchema
  },
  {
    metodo: "post",
    ruta: "/api/pedidos/{id}/pagos",
    acceso: "autenticado",
    resumen: "Registra un pago (no puede superar el saldo) y recalcula el estado de cobro",
    etiqueta,
    params,
    body: registrarPagoSchema,
    respuesta: pagosDelPedidoSchema,
    status: 201
  },
  {
    metodo: "post",
    ruta: "/api/pedidos/{id}/pagos/{pagoId}/anular",
    acceso: "administrador",
    resumen: "Anula un pago con motivo (no se borra) y recalcula el estado de cobro (solo administradores)",
    etiqueta,
    params: objeto({ id, pagoId: id }),
    body: anularPagoSchema,
    respuesta: pagosDelPedidoSchema
  }
] as const satisfies readonly Endpoint[];
