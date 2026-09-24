"use client";

import { useEffect, useState } from "react";

import { EstadoCargando } from "../../ui/estado-cargando";
import { EstadoVacio } from "../../ui/estado-vacio";
import { MensajeError } from "../../ui/mensaje-error";
import { TablaDatos } from "../../ui/tabla-datos";
import { formatearCantidad, formatearEstado, formatearFecha } from "../../../lib/formato";
import { listarComponentesItem } from "../../../lib/modulos/items-catalogo";
import { listarMovimientosStock, obtenerStockActual } from "../../../lib/modulos/stock";
import { calcularCapacidadProduccion, CapacidadComponente } from "../../../lib/stock/capacidad-produccion";
import { Existencia, MovimientoStock } from "../../../types/stock";

type PanelItemStockProps = {
  existencia: Existencia;
  version: number;
};

const ORIGENES: Record<string, string> = { PEDIDO: "Pedido", PRODUCCION: "Orden" };

function describirOrigen(movimiento: MovimientoStock) {
  const origen = ORIGENES[movimiento.origenMovimiento];
  return origen && movimiento.idReferenciaOrigen ? `${origen} #${movimiento.idReferenciaOrigen}` : "Manual";
}

// Detalle de un item: con que insumos se fabrica (y cuanto alcanza) y su historial de stock.
// Stock vigente de cada componente de la receta, cada uno en su tipo de stock. Se pide aparte: el
// listado de Stock esta paginado y un insumo puede no estar entre las filas cargadas.
async function stockDeComponentes(componentes: Awaited<ReturnType<typeof listarComponentesItem>>) {
  const stocks = await Promise.all(
    componentes.map((componente) =>
      obtenerStockActual(componente.idItemCatalogoHijo, componente.itemCatalogoComponente?.tipoItem ?? "INSUMO")
    )
  );

  return Object.fromEntries(stocks.map((stock) => [stock.idItemCatalogo, stock.stockActual]));
}

export function PanelItemStock({ existencia, version }: PanelItemStockProps) {
  const [movimientos, setMovimientos] = useState<MovimientoStock[] | null>(null);
  const [receta, setReceta] = useState<{ porComponente: CapacidadComponente[]; unidades: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setMovimientos(null);
    setError(null);

    Promise.all([
      listarMovimientosStock({ idItemCatalogo: existencia.idItemCatalogo, tipoStock: existencia.tipoStock, limit: 100 }),
      existencia.tipoItem === "PRODUCTO" ? listarComponentesItem(existencia.idItemCatalogo) : Promise.resolve([])
    ])
      .then(async ([historial, componentes]) => [historial, componentes, await stockDeComponentes(componentes)] as const)
      .then(([historial, componentes, stockPorItem]) => {
        if (!vigente) {
          return;
        }

        setMovimientos(historial);
        setReceta(
          existencia.tipoItem === "PRODUCTO"
            ? calcularCapacidadProduccion(
                componentes.map((componente) => ({
                  idItemCatalogoHijo: componente.idItemCatalogoHijo,
                  nombreInsumo: componente.itemCatalogoComponente?.nombre ?? "-",
                  cantidadRequerida: componente.cantidadRequerida,
                  activo: componente.activo
                })),
                stockPorItem
              )
            : null
        );
      })
      .catch((currentError) => {
        if (vigente) {
          setError(currentError instanceof Error ? currentError.message : "No fue posible cargar el detalle");
        }
      });

    return () => {
      vigente = false;
    };
  }, [existencia, version]);

  return (
    <section aria-label={`Stock de ${existencia.nombre}`} className="tarjeta-seccion">
      <div className="tarjeta-seccion__encabezado">
        <div>
          <p className="marca-pequena">Detalle de stock</p>
          <h3>{existencia.nombre}</h3>
          <p className="texto-secundario texto-secundario--compacto">
            {formatearEstado(existencia.tipoItem)} · Stock actual:{" "}
            <strong data-testid="stock-detalle">{formatearCantidad(existencia.stockActual)}</strong> · Minimo:{" "}
            {existencia.stockMinimo}
          </p>
        </div>
      </div>

      {error ? <MensajeError mensaje={error} /> : null}

      {receta ? (
        <div aria-label="Receta y capacidad de produccion" role="region">
          <p className="marca-pequena">Receta y capacidad de produccion</p>
          {receta.unidades === null ? (
            <p className="texto-secundario">Este producto no tiene receta activa.</p>
          ) : (
            <>
              <p className="texto-secundario">
                Con el stock actual de insumos se pueden fabricar{" "}
                <strong data-testid="capacidad-produccion">{receta.unidades}</strong> unidades.
              </p>
              <TablaDatos
                columns={[
                  { header: "Insumo", cell: (componente) => componente.nombreInsumo },
                  { header: "Por unidad", cell: (componente) => formatearCantidad(componente.cantidadRequerida) },
                  { header: "Stock insumo", cell: (componente) => formatearCantidad(componente.stockInsumo) },
                  { header: "Alcanza para", cell: (componente) => `${componente.alcanzaPara} u.` }
                ]}
                data={receta.porComponente}
                keyExtractor={(componente) => componente.idItemCatalogoHijo}
              />
            </>
          )}
        </div>
      ) : null}

      <div aria-label="Movimientos" role="region">
        <p className="marca-pequena">Movimientos</p>
        {movimientos === null && !error ? <EstadoCargando titulo="Cargando movimientos" /> : null}
        {movimientos?.length === 0 ? (
          <EstadoVacio descripcion="Todavia no tiene movimientos de stock." titulo="Sin movimientos" />
        ) : null}
        {movimientos && movimientos.length > 0 ? (
          <TablaDatos
            columns={[
              { header: "Fecha", cell: (movimiento) => formatearFecha(movimiento.fechaAlta) },
              { header: "Tipo", cell: (movimiento) => formatearEstado(movimiento.tipoMovimiento) },
              { header: "Origen", cell: describirOrigen },
              { header: "Antes", cell: (movimiento) => formatearCantidad(movimiento.stockAnterior) },
              {
                header: "Movimiento",
                cell: (movimiento) => {
                  const delta = Number(movimiento.stockActual) - Number(movimiento.stockAnterior);
                  return `${delta < 0 ? "-" : "+"}${formatearCantidad(movimiento.cantidadMovimiento)}`;
                }
              },
              { header: "Despues", cell: (movimiento) => formatearCantidad(movimiento.stockActual) },
              {
                header: "Usuario",
                cell: (movimiento) =>
                  movimiento.usuario ? `${movimiento.usuario.nombre} ${movimiento.usuario.apellido}` : "-"
              },
              { header: "Motivo", cell: (movimiento) => movimiento.observaciones || "-" }
            ]}
            data={movimientos}
            keyExtractor={(movimiento) => movimiento.idEstadoStock}
          />
        ) : null}
      </div>
    </section>
  );
}
