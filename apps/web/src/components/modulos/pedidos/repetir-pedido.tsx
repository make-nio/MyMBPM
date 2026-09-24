"use client";

import { useEffect, useState } from "react";

import { EstadoCargando } from "../../ui/estado-cargando";
import { MensajeError } from "../../ui/mensaje-error";
import { TablaDatos } from "../../ui/tabla-datos";
import { formatearCantidad, formatearEstado, formatearMoneda } from "../../../lib/formato";
import { prepararRepeticionPedido, repetirPedido } from "../../../lib/modulos/pedidos";
import { Pedido, RepeticionPedido } from "../../../types/pedidos";

type RepetirPedidoProps = {
  idPedido: string;
  onCancel: () => void;
  onRepetido: (pedido: Pedido) => void;
};

// Contenido del modal "Repetir pedido": muestra como quedaria el pedido nuevo con los precios de
// hoy y lo crea recien al confirmar.
export function RepetirPedido({ idPedido, onCancel, onRepetido }: RepetirPedidoProps) {
  const [vista, setVista] = useState<RepeticionPedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    prepararRepeticionPedido(idPedido)
      .then(setVista)
      .catch((causa: unknown) => setError(causa instanceof Error ? causa.message : "No fue posible preparar el pedido"));
  }, [idPedido]);

  async function confirmar() {
    setCreando(true);
    setError(null);

    try {
      onRepetido(await repetirPedido(idPedido));
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No fue posible repetir el pedido");
    } finally {
      setCreando(false);
    }
  }

  if (!vista) {
    return error ? <MensajeError mensaje={error} /> : <EstadoCargando titulo="Preparando el pedido" />;
  }

  const disponibles = vista.lineas.filter((linea) => linea.disponible).length;
  const cliente = `${vista.cliente.nombre} ${vista.cliente.apellido ?? ""}`.trim();

  return (
    <div className="formulario-modulo">
      <p className="texto-secundario texto-secundario--compacto">
        Cliente: <strong>{cliente}</strong> · Origen: {formatearEstado(vista.origenPedido)}
      </p>

      <TablaDatos
        columns={[
          { header: "Item", cell: (linea) => linea.nombre },
          { header: "Cantidad", cell: (linea) => formatearCantidad(linea.cantidad) },
          { header: "Precio antes", cell: (linea) => formatearMoneda(linea.precioAnterior) },
          {
            header: "Precio hoy",
            cell: (linea) => (linea.precioHoy === null ? "-" : formatearMoneda(linea.precioHoy))
          },
          {
            header: "Queda",
            cell: (linea) =>
              linea.disponible ? formatearMoneda(linea.subtotal) : <span className="texto-alerta">No se repite: {linea.motivo}</span>
          }
        ]}
        data={vista.lineas.map((linea, indice) => ({ ...linea, clave: String(indice) }))}
        keyExtractor={(linea) => linea.clave}
      />

      <p>
        Total con los precios de hoy: <strong data-testid="total-repeticion">{formatearMoneda(vista.total)}</strong>
      </p>
      {disponibles < vista.lineas.length && disponibles > 0 ? (
        <p className="texto-secundario texto-secundario--compacto">
          Las lineas que no se repiten quedan afuera; si hace falta, agregalas despues con otro item.
        </p>
      ) : null}
      {error ? <MensajeError mensaje={error} /> : null}

      <div className="acciones-formulario">
        <button className="boton-secundario" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="boton-primario" disabled={creando || disponibles === 0} onClick={() => void confirmar()} type="button">
          {creando ? "Creando..." : "Crear pedido nuevo"}
        </button>
      </div>
    </div>
  );
}
