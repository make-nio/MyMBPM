"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

import { useUsuarioAutenticado } from "../../../src/components/auth/contexto-sesion";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { formatearCantidad, formatearEstado, formatearFecha, formatearMoneda } from "../../../src/lib/formato";
import { obtenerResumenPanel } from "../../../src/lib/modulos/panel";
import { ResumenPanel } from "../../../src/types/panel";

function nombreCliente(cliente?: { nombre: string; apellido: string | null } | null) {
  return `${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}`.trim() || "Sin cliente";
}

function Indicador({ titulo, valor, detalle, href }: { titulo: string; valor: number; detalle: string; href: string }) {
  return (
    <Link aria-label={`${titulo}: ${valor}`} className="panel-dashboard__card panel-indicador" href={href}>
      <p>{titulo}</p>
      <strong>{valor}</strong>
      <p>{detalle}</p>
    </Link>
  );
}

function Seccion({ titulo, vacio, href, children }: { titulo: string; vacio: string; href: string; children: ReactNode[] }) {
  return (
    <section aria-label={titulo} className="tarjeta-seccion panel-seccion">
      <div className="panel-seccion__encabezado">
        <h2>{titulo}</h2>
        <Link href={href}>Ver todo</Link>
      </div>
      {children.length === 0 ? <p className="texto-secundario">{vacio}</p> : <ul className="panel-lista">{children}</ul>}
    </section>
  );
}

export default function PanelPage() {
  const usuario = useUsuarioAutenticado();
  const [resumen, setResumen] = useState<ResumenPanel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerResumenPanel(5)
      .then(setResumen)
      .catch((currentError) =>
        setError(currentError instanceof Error ? currentError.message : "No fue posible cargar el panel")
      );
  }, []);

  return (
    <section className="panel-dashboard">
      <header className="encabezado-modulo">
        <div>
          <p className="marca-pequena">Inicio</p>
          <h1>Hola, {usuario.nombre}</h1>
          <p>Lo que hay para hacer hoy.</p>
        </div>
      </header>

      {error ? <MensajeError mensaje={error} /> : null}
      {!resumen && !error ? <EstadoCargando titulo="Cargando el panel" /> : null}

      {resumen ? (
        <>
          <div className="panel-dashboard__grid">
            <Indicador
              detalle="Esperan confirmacion (todavia no descontaron stock)"
              href="/pedidos"
              titulo="Pedidos pendientes"
              valor={resumen.pedidos.pendientes.total}
            />
            <Indicador
              detalle="Confirmados, en preparacion o listos para entregar"
              href="/pedidos"
              titulo="Pedidos por entregar"
              valor={resumen.pedidos.confirmados.total}
            />
            <Indicador
              detalle={`${resumen.produccion.pendientes} ordenes esperan para iniciar`}
              href="/produccion"
              titulo="Ordenes en proceso"
              valor={resumen.produccion.enProceso.total}
            />
            <Indicador
              detalle="Items activos en o por debajo de su stock minimo"
              href="/stock"
              titulo="Stock bajo"
              valor={resumen.stockBajo.total}
            />
          </div>

          <section aria-label="Este mes" className="tarjeta-seccion panel-mes">
            <p className="marca-pequena">Este mes</p>
            <dl className="panel-mes__cifras">
              <div>
                <dt>Vendido</dt>
                <dd data-testid="mes-vendido">{formatearMoneda(resumen.ventasDelMes.vendido)}</dd>
              </div>
              <div>
                <dt>Costo</dt>
                <dd data-testid="mes-costo">{formatearMoneda(resumen.ventasDelMes.costo)}</dd>
              </div>
              <div>
                <dt>Ganancia</dt>
                <dd data-testid="mes-ganancia">{formatearMoneda(resumen.ventasDelMes.ganancia)}</dd>
              </div>
            </dl>
            <p className="texto-secundario texto-secundario--compacto">
              {resumen.ventasDelMes.pedidos} {resumen.ventasDelMes.pedidos === 1 ? "pedido confirmado" : "pedidos confirmados"}{" "}
              este mes, sin contar los cancelados.
              {resumen.ventasDelMes.lineasSinCosto > 0
                ? ` Hay ${resumen.ventasDelMes.lineasSinCosto} ${
                    resumen.ventasDelMes.lineasSinCosto === 1 ? "item vendido" : "items vendidos"
                  } sin costo cargado: la ganancia real es menor.`
                : null}
            </p>
          </section>

          <div className="panel-secciones">
            <Seccion href="/pedidos" titulo="Para confirmar" vacio="No hay pedidos pendientes.">
              {resumen.pedidos.pendientes.ultimos.map((pedido) => (
                <li key={pedido.idPedido}>
                  <strong>{pedido.numeroPedido ?? `Pedido ${pedido.idPedido}`}</strong>
                  <span>{nombreCliente(pedido.cliente)}</span>
                  <span className="texto-secundario">
                    {formatearMoneda(pedido.total)} · {formatearFecha(pedido.fechaAlta)}
                  </span>
                </li>
              ))}
            </Seccion>

            <Seccion href="/pedidos" titulo="Para entregar" vacio="No hay pedidos confirmados sin entregar.">
              {resumen.pedidos.confirmados.ultimos.map((pedido) => (
                <li key={pedido.idPedido}>
                  <strong>{pedido.numeroPedido ?? `Pedido ${pedido.idPedido}`}</strong>
                  <span>{nombreCliente(pedido.cliente)}</span>
                  <span className="texto-secundario">
                    {formatearEstado(pedido.estadoPedido)} · {formatearMoneda(pedido.total)}
                  </span>
                </li>
              ))}
            </Seccion>

            <Seccion href="/produccion" titulo="En produccion" vacio="No hay ordenes en proceso.">
              {resumen.produccion.enProceso.ordenes.map((orden) => (
                <li key={orden.idOrdenProduccion}>
                  <strong>Orden #{orden.idOrdenProduccion}</strong>
                  <span>
                    {orden.detalles
                      .map((detalle) => `${formatearCantidad(detalle.cantidad)} x ${detalle.itemCatalogoProducto?.nombre ?? "-"}`)
                      .join(", ") || "Sin productos"}
                  </span>
                  <span className="texto-secundario">Desde {formatearFecha(orden.fechaInicio)}</span>
                </li>
              ))}
            </Seccion>

            <Seccion href="/stock" titulo="Reponer" vacio="Nada por debajo del minimo.">
              {resumen.stockBajo.items.map((item) => (
                <li key={item.idItemCatalogo}>
                  <strong>{item.nombre}</strong>
                  <span>
                    {formatearCantidad(item.stockActual)} de minimo {item.stockMinimo}
                  </span>
                  <span className="texto-secundario">{formatearEstado(item.tipoItem)}</span>
                </li>
              ))}
            </Seccion>

            <Seccion href="/stock" titulo="Ultimos movimientos" vacio="Todavia no hay movimientos de stock.">
              {resumen.ultimosMovimientos.map((movimiento) => {
                const signo = Number(movimiento.stockActual) < Number(movimiento.stockAnterior) ? "-" : "+";

                return (
                  <li key={movimiento.idEstadoStock}>
                    <strong>{movimiento.itemCatalogo?.nombre ?? "-"}</strong>
                    <span>
                      {formatearEstado(movimiento.tipoMovimiento)} {signo}
                      {formatearCantidad(movimiento.cantidadMovimiento)} · queda {formatearCantidad(movimiento.stockActual)}
                    </span>
                    <span className="texto-secundario">
                      {formatearFecha(movimiento.fechaAlta)}
                      {movimiento.usuario ? ` · ${movimiento.usuario.nombre} ${movimiento.usuario.apellido}` : ""}
                    </span>
                  </li>
                );
              })}
            </Seccion>
          </div>
        </>
      ) : null}
    </section>
  );
}
