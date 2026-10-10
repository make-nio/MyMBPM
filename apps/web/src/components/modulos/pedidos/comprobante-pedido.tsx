import { formatearCantidad, formatearDia, formatearEstado, formatearFecha, formatearMoneda } from "../../../lib/formato";
import { cantidadesDevueltas } from "../../../lib/modulos/devoluciones";
import { DevolucionesDelPedido } from "../../../types/devoluciones";
import { PagosDelPedido } from "../../../types/pagos";
import { PedidoCompleto } from "../../../types/pedidos";

export const LEYENDA_NO_FISCAL = "Documento no válido como factura";

// Remito no fiscal (#95): acompaña la entrega y lo firma quien recibe. Maxi factura a mano, afuera.
// El numero es el del pedido (un remito por pedido). Solo datos que el cliente puede ver: nunca
// costos, ganancia ni observaciones internas, aunque la API los mande (a un administrador le llegan).
export function ComprobantePedido({
  pedido,
  pagos = null,
  devoluciones = null
}: {
  pedido: PedidoCompleto;
  pagos?: PagosDelPedido | null;
  devoluciones?: DevolucionesDelPedido | null;
}) {
  const cliente = pedido.cliente;
  const nombreCliente = `${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}`.trim() || "-";
  const domicilio = [cliente?.domicilio, cliente?.localidad, cliente?.provincia].filter(Boolean).join(", ");
  const detalles = pedido.detalles;
  const numero = pedido.numeroPedido ?? `Pedido ${pedido.idPedido}`;
  const devueltas = cantidadesDevueltas(devoluciones?.devoluciones ?? []);
  const huboDevolucion = devueltas.size > 0;
  const columnasAntesDelImporte = huboDevolucion ? 4 : 3;

  return (
    <article aria-label={`Remito del pedido ${numero}`} className="comprobante">
      <header className="comprobante__encabezado">
        <div>
          <p className="comprobante__marca">MyM</p>
          <h1 className="comprobante__subtitulo">Remito</h1>
        </div>
        <div className="comprobante__numero">
          <strong>Remito N.º {numero}</strong>
          <span>Fecha del pedido: {formatearFecha(pedido.fechaAlta)}</span>
          {pedido.fechaEntregaReal ? (
            <span data-testid="remito-entregado">Entregado: {formatearDia(pedido.fechaEntregaReal)}</span>
          ) : pedido.fechaEntrega ? (
            <span>Entrega prometida: {formatearDia(pedido.fechaEntrega)}</span>
          ) : null}
        </div>
      </header>

      <p className="comprobante__leyenda" role="note">
        {LEYENDA_NO_FISCAL}
      </p>

      <section aria-label="Cliente" className="comprobante__cliente">
        <p>
          <strong>Cliente:</strong> {nombreCliente}
        </p>
        {cliente?.documento ? <p>Documento: {cliente.documento}</p> : null}
        {cliente?.telefono ? <p>Teléfono: {cliente.telefono}</p> : null}
        {cliente?.email ? <p>Email: {cliente.email}</p> : null}
        {domicilio ? <p>Domicilio: {domicilio}</p> : null}
      </section>

      <table aria-label="Detalle del pedido" className="comprobante__tabla">
        <thead>
          <tr>
            <th scope="col">Ítem</th>
            <th className="comprobante__numerica" scope="col">Cantidad</th>
            {huboDevolucion ? (
              <th className="comprobante__numerica" scope="col">
                Devuelto
              </th>
            ) : null}
            <th className="comprobante__numerica" scope="col">Precio unitario</th>
            <th className="comprobante__numerica" scope="col">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {detalles.map((detalle) => (
            <tr key={detalle.idPedidoDetalle}>
              <td>{detalle.nombreItemSnapshot}</td>
              <td className="comprobante__numerica">{formatearCantidad(detalle.cantidad)}</td>
              {huboDevolucion ? (
                <td className="comprobante__numerica">{formatearCantidad(devueltas.get(detalle.idPedidoDetalle) ?? 0)}</td>
              ) : null}
              <td className="comprobante__numerica">{formatearMoneda(detalle.precioUnitario)}</td>
              <td className="comprobante__numerica">{formatearMoneda(detalle.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {pedido.subtotal !== pedido.total ? (
            <tr>
              <th colSpan={columnasAntesDelImporte} scope="row">
                Subtotal
              </th>
              <td className="comprobante__numerica">{formatearMoneda(pedido.subtotal)}</td>
            </tr>
          ) : null}
          <tr className="comprobante__total">
            <th colSpan={columnasAntesDelImporte} scope="row">
              Total
            </th>
            <td className="comprobante__numerica" data-testid="comprobante-total">
              {formatearMoneda(pedido.total)}
            </td>
          </tr>
          {huboDevolucion && devoluciones ? (
            <tr>
              <th colSpan={columnasAntesDelImporte} scope="row">
                Devuelto
              </th>
              <td className="comprobante__numerica" data-testid="remito-devuelto">
                {formatearMoneda(devoluciones.devuelto)}
              </td>
            </tr>
          ) : null}
          {pagos && Number(pagos.cobrado) > 0 ? (
            <>
              <tr>
                <th colSpan={columnasAntesDelImporte} scope="row">
                  Cobrado
                </th>
                <td className="comprobante__numerica" data-testid="comprobante-cobrado">
                  {formatearMoneda(pagos.cobrado)}
                </td>
              </tr>
              <tr>
                <th colSpan={columnasAntesDelImporte} scope="row">
                  Saldo
                </th>
                <td className="comprobante__numerica" data-testid="comprobante-saldo">
                  {formatearMoneda(pagos.saldo)}
                </td>
              </tr>
            </>
          ) : null}
        </tfoot>
      </table>

      <p className="comprobante__estado">
        Estado del pedido: {formatearEstado(pedido.estadoPedido)} · Cobro: {formatearEstado(pedido.estadoCobro)}
      </p>

      {pedido.observacionesCliente ? (
        <p className="comprobante__observaciones">
          <strong>Observaciones:</strong> {pedido.observacionesCliente}
        </p>
      ) : null}

      <section aria-label="Recibí conforme" className="comprobante__firma">
        <p className="comprobante__firma-titulo">Recibí conforme</p>
        <div className="comprobante__firma-campos">
          {["Firma", "Aclaración", "DNI", "Fecha de recepción"].map((campo) => (
            <p className="comprobante__firma-campo" key={campo}>
              {campo}
            </p>
          ))}
        </div>
      </section>

      <footer className="comprobante__pie">{LEYENDA_NO_FISCAL}</footer>
    </article>
  );
}
