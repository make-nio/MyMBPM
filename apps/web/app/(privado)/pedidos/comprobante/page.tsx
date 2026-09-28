"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ComprobantePedido } from "../../../../src/components/modulos/pedidos/comprobante-pedido";
import { EstadoCargando } from "../../../../src/components/ui/estado-cargando";
import { MensajeError } from "../../../../src/components/ui/mensaje-error";
import { listarPagos } from "../../../../src/lib/modulos/pagos";
import { obtenerPedido } from "../../../../src/lib/modulos/pedidos";
import { PagosDelPedido } from "../../../../src/types/pagos";
import { PedidoCompleto } from "../../../../src/types/pedidos";

// /pedidos/comprobante?pedido=ID: comprobante no fiscal para imprimir o guardar como PDF desde el
// navegador. Al imprimir, globals.css oculta el menu, el encabezado y los botones.
export default function ComprobantePedidoPage() {
  const [idPedido, setIdPedido] = useState<string | null>(null);
  const [pedido, setPedido] = useState<PedidoCompleto | null>(null);
  const [pagos, setPagos] = useState<PagosDelPedido | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("pedido");

    if (!id || !/^\d+$/.test(id)) {
      setError("Falta el pedido: abri el comprobante desde el detalle de un pedido.");
      return;
    }

    setIdPedido(id);
    obtenerPedido(id)
      .then((respuesta) => {
        setPedido(respuesta);
        document.title = `Comprobante ${respuesta.numeroPedido ?? respuesta.idPedido} · MyM`;
      })
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : "No fue posible cargar el pedido"));
    // Lo cobrado y el saldo: si no se pueden cargar, el comprobante sale sin esas lineas.
    listarPagos(id)
      .then(setPagos)
      .catch(() => undefined);
  }, []);

  return (
    <div className="pagina-comprobante">
      <div className="acciones-tabla no-imprimir">
        <Link className="boton-secundario" href={idPedido ? `/pedidos?pedido=${idPedido}` : "/pedidos"}>
          Volver al pedido
        </Link>
        <button className="boton-primario" disabled={!pedido} onClick={() => window.print()} type="button">
          Imprimir
        </button>
      </div>

      {error ? <MensajeError mensaje={error} /> : null}
      {!error && !pedido ? <EstadoCargando titulo="Cargando comprobante" /> : null}
      {pedido ? <ComprobantePedido pagos={pagos} pedido={pedido} /> : null}
    </div>
  );
}
