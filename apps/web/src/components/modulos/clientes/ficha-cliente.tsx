"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EstadoCargando } from "../../ui/estado-cargando";
import { EstadoVacio } from "../../ui/estado-vacio";
import { MensajeError } from "../../ui/mensaje-error";
import { PieListado } from "../../ui/pie-listado";
import { TablaDatos } from "../../ui/tabla-datos";
import { useListadoPaginado } from "../../../hooks/use-listado-paginado";
import { formatearDia, formatearEstado, formatearFecha, formatearMoneda } from "../../../lib/formato";
import { obtenerResumenCliente } from "../../../lib/modulos/clientes";
import { listarPedidos } from "../../../lib/modulos/pedidos";
import { Cliente, ResumenCliente } from "../../../types/clientes";
import { Pedido } from "../../../types/pedidos";

// Ficha del cliente: sus datos, lo que compro (vendido, sin costos) y su historial de pedidos.
export function FichaCliente({ cliente }: { cliente: Cliente }) {
  const nombre = `${cliente.nombre} ${cliente.apellido ?? ""}`.trim();
  const [resumen, setResumen] = useState<ResumenCliente | null>(null);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  const domicilio = [cliente.domicilio, cliente.localidad, cliente.provincia].filter(Boolean).join(", ");
  const contacto = [cliente.telefono, cliente.email, cliente.instagram].filter(Boolean).join(" · ");

  useEffect(() => {
    setResumen(null);
    setErrorResumen(null);
    obtenerResumenCliente(cliente.idCliente)
      .then(setResumen)
      .catch((causa: unknown) => setErrorResumen(causa instanceof Error ? causa.message : "No fue posible cargar el resumen"));
  }, [cliente.idCliente]);

  const historial = useListadoPaginado<Pedido>(
    (limit, offset) => listarPedidos({ idCliente: cliente.idCliente, limit, offset }),
    [cliente.idCliente],
    "No fue posible cargar los pedidos del cliente"
  );

  return (
    <section aria-label={`Ficha de ${nombre}`} className="tarjeta-seccion">
      <div className="tarjeta-seccion__encabezado">
        <div>
          <p className="marca-pequena">Ficha del cliente</p>
          <h3>{nombre}</h3>
          <p className="texto-secundario texto-secundario--compacto">
            {contacto || "Sin datos de contacto"}
            {domicilio ? ` · ${domicilio}` : ""}
            {cliente.activo ? "" : " · Inactivo"}
          </p>
          {errorResumen ? <MensajeError mensaje={errorResumen} /> : null}
          {resumen ? (
            <p className="texto-secundario texto-secundario--compacto">
              Total comprado: <strong data-testid="total-comprado">{formatearMoneda(resumen.totalComprado)}</strong> en{" "}
              <strong data-testid="pedidos-comprados">{resumen.pedidosComprados}</strong>{" "}
              {resumen.pedidosComprados === 1 ? "pedido" : "pedidos"}
              {resumen.fechaUltimaCompra ? ` · Ultima compra: ${formatearDia(resumen.fechaUltimaCompra)}` : ""}
            </p>
          ) : null}
          <p className="texto-secundario texto-secundario--compacto">
            Cuenta los pedidos confirmados, sin los cancelados.
          </p>
        </div>
      </div>

      <h4>Pedidos</h4>
      {historial.error ? <MensajeError mensaje={historial.error} /> : null}
      {historial.cargando ? <EstadoCargando titulo="Cargando pedidos del cliente" /> : null}
      {!historial.cargando && !historial.error && historial.items.length === 0 ? (
        <EstadoVacio descripcion="Todavia no tiene pedidos cargados." titulo="Sin pedidos" />
      ) : null}
      {!historial.cargando && historial.items.length > 0 ? (
        <TablaDatos
          columns={[
            { header: "Pedido", cell: (pedido) => pedido.numeroPedido ?? pedido.idPedido },
            { header: "Alta", cell: (pedido) => formatearFecha(pedido.fechaAlta) },
            { header: "Estado", cell: (pedido) => formatearEstado(pedido.estadoPedido) },
            { header: "Cobro", cell: (pedido) => formatearEstado(pedido.estadoCobro) },
            { header: "Total", cell: (pedido) => formatearMoneda(pedido.total) },
            {
              header: "Acciones",
              cell: (pedido) => (
                <Link className="boton-secundario" href={`/pedidos?pedido=${pedido.idPedido}`}>
                  Ver pedido
                </Link>
              )
            }
          ]}
          data={historial.items}
          keyExtractor={(pedido) => pedido.idPedido}
        />
      ) : null}
      {!historial.cargando ? (
        <PieListado
          cantidad={historial.items.length}
          cargandoMas={historial.cargandoMas}
          hayMas={historial.hayMas}
          onCargarMas={() => void historial.cargarMas()}
        />
      ) : null}
    </section>
  );
}
