import { MEDIOS_PAGO } from "../../compartido/dominio/enums";
import { registrarDevolucionSchema } from "../../modulos/devoluciones/devoluciones.schemas";
import { decimal, Endpoint, fecha, id, lista, objeto, z } from "../base";

const etiqueta = "devoluciones";

const usuarioResumido = objeto({ idUsuario: id, nombre: z.string(), apellido: z.string() });

const detalleSchema = objeto({
  idDevolucionDetalle: id,
  idDevolucion: id,
  idPedidoDetalle: id,
  cantidad: decimal,
  precioUnitario: decimal,
  subtotal: decimal,
  pedidoDetalle: objeto({ idItemCatalogo: id, nombreItemSnapshot: z.string() })
});

// Modelo Devolucion con sus lineas, quien la registro (solo nombre) y el reintegro, si hubo
// (un pago con monto negativo).
const devolucionSchema = objeto({
  idDevolucion: id,
  idPedido: id,
  fecha,
  motivo: z.string(),
  devuelveStock: z.boolean(),
  idPagoReintegro: id.nullable(),
  idUsuario: id.nullable(),
  usuario: usuarioResumido.nullable(),
  pagoReintegro: objeto({ idPago: id, monto: decimal, medioPago: z.enum(MEDIOS_PAGO) }).nullable(),
  detalles: lista(detalleSchema)
}).openapi("Devolucion");

// devolucionesService.listar: las devoluciones del pedido y su valor total.
const devolucionesDelPedidoSchema = objeto({
  devuelto: decimal,
  devoluciones: lista(devolucionSchema)
}).openapi("DevolucionesDelPedido");

const params = objeto({ id });

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/pedidos/{id}/devoluciones",
    acceso: "autenticado",
    resumen: "Devoluciones de un pedido entregado, con su valor total",
    etiqueta,
    params,
    respuesta: devolucionesDelPedidoSchema
  },
  {
    metodo: "post",
    ruta: "/api/pedidos/{id}/devoluciones",
    acceso: "autenticado",
    resumen:
      "Registra la devolucion de un pedido entregado: lo devuelto vuelve al stock y se reintegra la plata segun la configuracion",
    etiqueta,
    params,
    body: registrarDevolucionSchema,
    respuesta: devolucionesDelPedidoSchema,
    status: 201
  }
] as const satisfies readonly Endpoint[];
