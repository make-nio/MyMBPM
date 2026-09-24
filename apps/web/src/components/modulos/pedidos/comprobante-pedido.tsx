import { formatearCantidad, formatearDia, formatearEstado, formatearFecha, formatearMoneda } from "../../../lib/formato";
import { PedidoCompleto } from "../../../types/pedidos";

export const LEYENDA_NO_FISCAL = "Documento no válido como factura";

// Comprobante no fiscal para darle al cliente. Solo datos que el cliente puede ver: nunca costos,
// ganancia ni observaciones internas, aunque la API los mande (a un administrador le llegan).
export function ComprobantePedido({ pedido }: { pedido: PedidoCompleto }) {
  const cliente = pedido.cliente;
  const nombreCliente = `${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}`.trim() || "-";
  const domicilio = [cliente?.domicilio, cliente?.localidad, cliente?.provincia].filter(Boolean).join(", ");
  const detalles = pedido.detalles ?? [];
  const numero = pedido.numeroPedido ?? `Pedido ${pedido.idPedido}`;

  return (
    <article aria-label={`Comprobante del pedido ${numero}`} className="comprobante">
      <header className="comprobante__encabezado">
        <div>
          <p className="comprobante__marca">MyM</p>
          <h1 className="comprobante__subtitulo">Comprobante de pedido</h1>
        </div>
        <div className="comprobante__numero">
          <strong>{numero}</strong>
          <span>Fecha: {formatearFecha(pedido.fechaAlta)}</span>
          {pedido.fechaEntrega ? <span>Entrega prometida: {formatearDia(pedido.fechaEntrega)}</span> : null}
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
            <th className="comprobante__numerica" scope="col">Precio unitario</th>
            <th className="comprobante__numerica" scope="col">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {detalles.map((detalle) => (
            <tr key={detalle.idPedidoDetalle}>
              <td>{detalle.nombreItemSnapshot}</td>
              <td className="comprobante__numerica">{formatearCantidad(detalle.cantidad)}</td>
              <td className="comprobante__numerica">{formatearMoneda(detalle.precioUnitario)}</td>
              <td className="comprobante__numerica">{formatearMoneda(detalle.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {pedido.subtotal !== pedido.total ? (
            <tr>
              <th colSpan={3} scope="row">
                Subtotal
              </th>
              <td className="comprobante__numerica">{formatearMoneda(pedido.subtotal)}</td>
            </tr>
          ) : null}
          <tr className="comprobante__total">
            <th colSpan={3} scope="row">
              Total
            </th>
            <td className="comprobante__numerica" data-testid="comprobante-total">
              {formatearMoneda(pedido.total)}
            </td>
          </tr>
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

      <footer className="comprobante__pie">{LEYENDA_NO_FISCAL}</footer>
    </article>
  );
}
