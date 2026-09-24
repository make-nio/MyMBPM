"use client";

import { TablaDatos } from "../../ui/tabla-datos";
import { formatearMoneda } from "../../../lib/formato";
import { alturasRelativas, etiquetaMesCorta, etiquetaMesLarga } from "../../../lib/reportes/grafico";
import { VentaDelMes } from "../../../types/reportes";

const ANCHO = 720;
const ALTO = 240;
const ALTO_BARRAS = 180;
const MARGEN_ARRIBA = 16;

type GraficoVentasProps = {
  // null mientras carga: se dibuja la misma estructura vacia para que el reporte de abajo no
  // salte cuando llegan los datos.
  meses: VentaDelMes[] | null;
  mesSeleccionado: string;
  onElegirMes: (mes: string) => void;
};

// Barras de lo vendido por mes, en SVG propio (sin librerias de graficos: pesan mas que toda la
// pantalla). Los mismos datos van en una tabla para leerlos con lector de pantalla o copiarlos.
export function GraficoVentas({ meses: datos, mesSeleccionado, onElegirMes }: GraficoVentasProps) {
  const meses = datos ?? [];
  const cargando = datos === null;
  const alturas = alturasRelativas(meses.map((mes) => Number(mes.vendido)));
  const paso = ANCHO / Math.max(meses.length, 1);
  const ancho = paso * 0.62;
  const resumen = meses.map((mes) => `${etiquetaMesLarga(mes.mes)}: ${formatearMoneda(mes.vendido)}`).join("; ");

  return (
    <section aria-busy={cargando} aria-label="Ventas de los ultimos 12 meses" className="tarjeta-seccion grafico-ventas">
      <div className="tarjeta-seccion__encabezado">
        <h2>Ultimos 12 meses</h2>
      </div>
      <p className="texto-secundario texto-secundario--compacto">
        Vendido por mes, con el mismo criterio del reporte. Toca una barra para ver ese mes.
      </p>

      <svg
        aria-label={cargando ? "Cargando lo vendido por mes" : `Vendido por mes. ${resumen}`}
        className="grafico-ventas__svg"
        role="img"
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
      >
        <line className="grafico-ventas__base" x1="0" x2={ANCHO} y1={MARGEN_ARRIBA + ALTO_BARRAS} y2={MARGEN_ARRIBA + ALTO_BARRAS} />
        {meses.map((mes, indice) => {
          const alto = Math.max(alturas[indice] * ALTO_BARRAS, Number(mes.vendido) > 0 ? 2 : 0);
          const x = indice * paso + (paso - ancho) / 2;
          const seleccionado = mes.mes === mesSeleccionado;

          return (
            <g key={mes.mes} onClick={() => onElegirMes(mes.mes)}>
              <title>{`${etiquetaMesLarga(mes.mes)}: ${formatearMoneda(mes.vendido)} en ${mes.pedidos} pedidos`}</title>
              {/* Zona de toque de toda la columna, no solo la barra (un mes sin ventas no tiene barra). */}
              <rect className="grafico-ventas__zona" height={ALTO_BARRAS + MARGEN_ARRIBA} width={paso} x={indice * paso} y="0" />
              <rect
                className={seleccionado ? "grafico-ventas__barra grafico-ventas__barra--elegida" : "grafico-ventas__barra"}
                data-mes={mes.mes}
                height={alto}
                rx="4"
                width={ancho}
                x={x}
                y={MARGEN_ARRIBA + ALTO_BARRAS - alto}
              />
              <text className="grafico-ventas__eje" textAnchor="middle" x={indice * paso + paso / 2} y={ALTO - 24}>
                {etiquetaMesCorta(mes.mes).split(" ")[0]}
              </text>
              {/* El año, en la primera barra y en cada enero. */}
              {indice === 0 || mes.mes.endsWith("-01") ? (
                <text className="grafico-ventas__eje" textAnchor="middle" x={indice * paso + paso / 2} y={ALTO - 2}>
                  {mes.mes.slice(0, 4)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <details className="grafico-ventas__datos">
        <summary>Ver los datos</summary>
        <TablaDatos
          columns={[
            { header: "Mes", cell: (mes) => etiquetaMesLarga(mes.mes) },
            { header: "Pedidos", cell: (mes) => mes.pedidos },
            { header: "Vendido", cell: (mes) => formatearMoneda(mes.vendido) },
            {
              header: "Acciones",
              cell: (mes) => (
                <button
                  aria-label={`Ver ${etiquetaMesLarga(mes.mes)}`}
                  className="boton-secundario"
                  onClick={() => onElegirMes(mes.mes)}
                  type="button"
                >
                  Ver mes
                </button>
              )
            }
          ]}
          data={meses}
          keyExtractor={(mes) => mes.mes}
        />
      </details>
    </section>
  );
}
