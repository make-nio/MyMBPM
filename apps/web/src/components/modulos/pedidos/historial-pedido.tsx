"use client";

import { useEffect, useState } from "react";

import { formatearEstado, formatearFecha } from "../../../lib/formato";
import { listarHistorialPedido } from "../../../lib/modulos/pedidos";
import { CambioEstadoPedido } from "../../../types/pedidos";
import { MensajeError } from "../../ui/mensaje-error";

type HistorialPedidoProps = {
  idPedido: string;
  // Cambia cuando el pedido cambia: vuelve a pedir el historial.
  version: string;
};

// Linea de tiempo del pedido (#99): cada cambio de estado, cuando, quien y por que.
export function HistorialPedido({ idPedido, version }: HistorialPedidoProps) {
  const [cambios, setCambios] = useState<CambioEstadoPedido[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);
    listarHistorialPedido(idPedido)
      .then((lista) => {
        if (vigente) {
          setCambios(lista);
        }
      })
      .catch((actual) => {
        if (vigente) {
          setError(actual instanceof Error ? actual.message : "No fue posible cargar el historial");
        }
      });
    return () => {
      vigente = false;
    };
  }, [idPedido, version]);

  return (
    <div aria-label="Historial del pedido" role="region">
      <p className="marca-pequena">Historial</p>
      {error ? <MensajeError mensaje={error} /> : null}
      {cambios === null ? null : cambios.length === 0 ? (
        <p className="texto-secundario">Sin cambios registrados.</p>
      ) : (
        <ol className="linea-tiempo">
          {cambios.map((cambio) => (
            <li className="linea-tiempo__paso" key={cambio.idHistorialEstadoPedido}>
              <strong>
                {cambio.estadoAnterior
                  ? `${formatearEstado(cambio.estadoAnterior)} → ${formatearEstado(cambio.estadoNuevo)}`
                  : `Alta (${formatearEstado(cambio.estadoNuevo)})`}
              </strong>
              <span className="texto-secundario">
                {" "}
                · {formatearFecha(cambio.fecha)} · {cambio.usuario ? `${cambio.usuario.nombre} ${cambio.usuario.apellido}` : "Sin usuario"}
              </span>
              {cambio.observacion ? <span className="linea-tiempo__observacion">{cambio.observacion}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
