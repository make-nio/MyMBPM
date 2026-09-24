"use client";

import { useEffect, useState } from "react";

import { useUsuarioAutenticado } from "../../../src/components/auth/contexto-sesion";
import { BotonExportarCsv } from "../../../src/components/ui/boton-exportar-csv";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { generarCsv, numeroCsv } from "../../../src/lib/csv";
import { diaArgentina, formatearCantidad, formatearMoneda } from "../../../src/lib/formato";
import { GraficoVentas } from "../../../src/components/modulos/reportes/grafico-ventas";
import { obtenerVentasDelMes, obtenerVentasPorMes } from "../../../src/lib/modulos/reportes";
import { ReporteVentasMes, VentaDelMes } from "../../../src/types/reportes";

const COLUMNAS_CSV_ITEM = ["Item", "Cantidad", "Pedidos", "Vendido", "Costo", "Ganancia"];
const COLUMNAS_CSV_CLIENTE = ["Cliente", "Pedidos", "Vendido", "Costo", "Ganancia"];

export default function ReportesPage() {
  const usuario = useUsuarioAutenticado();

  if (!usuario.esAdministrador) {
    return (
      <section className="modulo-panel">
        <EstadoVacio descripcion="Los reportes de ventas estan disponibles solo para administradores." titulo="Sin acceso" />
      </section>
    );
  }

  return <ReporteVentas />;
}

function ReporteVentas() {
  // "AAAA-MM" del mes en curso en Argentina, como lo usa <input type="month">.
  const [mes, setMes] = useState(() => diaArgentina(new Date()).slice(0, 7));
  const [reporte, setReporte] = useState<ReporteVentasMes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meses, setMeses] = useState<VentaDelMes[] | null>(null);
  const [errorMeses, setErrorMeses] = useState<string | null>(null);

  // El grafico no depende del mes elegido: se carga una vez.
  useEffect(() => {
    obtenerVentasPorMes()
      .then((datos) => setMeses(datos.meses))
      .catch((currentError) =>
        setErrorMeses(currentError instanceof Error ? currentError.message : "No fue posible cargar el grafico")
      );
  }, []);

  useEffect(() => {
    if (!mes) {
      return;
    }

    let vigente = true;
    setReporte(null);
    setError(null);
    obtenerVentasDelMes(mes)
      .then((datos) => vigente && setReporte(datos))
      .catch((currentError) =>
        vigente && setError(currentError instanceof Error ? currentError.message : "No fue posible cargar el reporte")
      );

    return () => {
      vigente = false;
    };
  }, [mes]);

  const csvPorItem = async () =>
    generarCsv(
      COLUMNAS_CSV_ITEM,
      (reporte?.porItem ?? []).map((item) => [
        item.nombre,
        numeroCsv(item.cantidad),
        item.pedidos,
        numeroCsv(item.vendido),
        numeroCsv(item.costo),
        numeroCsv(item.ganancia)
      ])
    );

  const csvPorCliente = async () =>
    generarCsv(
      COLUMNAS_CSV_CLIENTE,
      (reporte?.porCliente ?? []).map((cliente) => [
        cliente.nombre,
        cliente.pedidos,
        numeroCsv(cliente.vendido),
        numeroCsv(cliente.costo),
        numeroCsv(cliente.ganancia)
      ])
    );

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        descripcion="Lo vendido en el mes por item y por cliente: pedidos confirmados en el mes, sin cancelados (el mismo criterio del panel)."
        filtros={
          <div className="filtros-inline">
            <label className="campo-filtro-fecha" htmlFor="reporte-mes">
              <span>Mes</span>
              <input
                className="control-filtro"
                id="reporte-mes"
                onChange={(event) => setMes(event.target.value)}
                type="month"
                value={mes}
              />
            </label>
          </div>
        }
        titulo="Reportes"
      />

      {errorMeses ? <MensajeError mensaje={errorMeses} /> : null}
      {errorMeses ? null : <GraficoVentas meses={meses} mesSeleccionado={mes} onElegirMes={setMes} />}

      {error ? <MensajeError mensaje={error} /> : null}
      {!reporte && !error ? <EstadoCargando titulo="Cargando el reporte" /> : null}

      {reporte ? (
        <>
          <section aria-label="Totales del mes" className="tarjeta-seccion panel-mes">
            <dl className="panel-mes__cifras">
              <div>
                <dt>Pedidos</dt>
                <dd data-testid="reporte-pedidos">{reporte.totales.pedidos}</dd>
              </div>
              <div>
                <dt>Vendido</dt>
                <dd data-testid="reporte-vendido">{formatearMoneda(reporte.totales.vendido)}</dd>
              </div>
              <div>
                <dt>Costo</dt>
                <dd data-testid="reporte-costo">{formatearMoneda(reporte.totales.costo)}</dd>
              </div>
              <div>
                <dt>Ganancia</dt>
                <dd data-testid="reporte-ganancia">{formatearMoneda(reporte.totales.ganancia)}</dd>
              </div>
            </dl>
            {reporte.totales.lineasSinCosto > 0 ? (
              <p className="texto-secundario texto-secundario--compacto">
                Hay {reporte.totales.lineasSinCosto}{" "}
                {reporte.totales.lineasSinCosto === 1 ? "item vendido" : "items vendidos"} sin costo cargado: la ganancia
                real es menor.
              </p>
            ) : null}
          </section>

          <section aria-label="Por item" className="tarjeta-seccion">
            <div className="tarjeta-seccion__encabezado">
              <h2>Por item</h2>
              <BotonExportarCsv generar={csvPorItem} nombre={`ventas-por-item-${mes}`} />
            </div>
            {reporte.porItem.length === 0 ? (
              <p className="texto-secundario">No hubo ventas en el mes.</p>
            ) : (
              <TablaDatos
                columns={[
                  { header: "Item", cell: (item) => item.nombre },
                  { header: "Cantidad", cell: (item) => formatearCantidad(item.cantidad) },
                  { header: "Pedidos", cell: (item) => item.pedidos },
                  { header: "Vendido", cell: (item) => formatearMoneda(item.vendido) },
                  { header: "Costo", cell: (item) => formatearMoneda(item.costo) },
                  { header: "Ganancia", cell: (item) => formatearMoneda(item.ganancia) }
                ]}
                data={reporte.porItem}
                keyExtractor={(item) => item.idItemCatalogo}
              />
            )}
          </section>

          <section aria-label="Por cliente" className="tarjeta-seccion">
            <div className="tarjeta-seccion__encabezado">
              <h2>Por cliente</h2>
              <BotonExportarCsv generar={csvPorCliente} nombre={`ventas-por-cliente-${mes}`} />
            </div>
            {reporte.porCliente.length === 0 ? (
              <p className="texto-secundario">No hubo ventas en el mes.</p>
            ) : (
              <TablaDatos
                columns={[
                  { header: "Cliente", cell: (cliente) => cliente.nombre },
                  { header: "Pedidos", cell: (cliente) => cliente.pedidos },
                  { header: "Vendido", cell: (cliente) => formatearMoneda(cliente.vendido) },
                  { header: "Costo", cell: (cliente) => formatearMoneda(cliente.costo) },
                  { header: "Ganancia", cell: (cliente) => formatearMoneda(cliente.ganancia) }
                ]}
                data={reporte.porCliente}
                keyExtractor={(cliente) => cliente.idCliente}
              />
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
