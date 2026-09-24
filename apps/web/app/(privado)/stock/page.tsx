"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BotonExportarCsv } from "../../../src/components/ui/boton-exportar-csv";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { MensajeExito } from "../../../src/components/ui/mensaje-exito";
import { Modal } from "../../../src/components/ui/modal";
import { PieListado } from "../../../src/components/ui/pie-listado";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useDesplazarAlDetalle } from "../../../src/hooks/use-desplazar-al-detalle";
import { useListadoPaginado } from "../../../src/hooks/use-listado-paginado";
import { useModal } from "../../../src/hooks/use-modal";
import { usePrecargar } from "../../../src/hooks/use-precargar";
import { formatearCantidad, formatearEstado, formatearFecha } from "../../../src/lib/formato";
import { generarCsv, numeroCsv } from "../../../src/lib/csv";
import { cargarTodo } from "../../../src/lib/paginacion";
import { crearAjusteStock, listarExistencias } from "../../../src/lib/modulos/stock";
import { cantidadParaReponer, rutaOrdenParaReponer } from "../../../src/lib/stock/reponer";
import { Existencia, TipoAjuste, TipoStock } from "../../../src/types/stock";

// Paneles, historiales e importacion se ven solo al elegir un registro o abrir su modal: su
// codigo no entra en el JS inicial de la pantalla, que primero tiene que mostrar la lista.
const PanelItemStock = dynamic(() => import("../../../src/components/modulos/stock/panel-item-stock").then((modulo) => modulo.PanelItemStock), {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando detalle" />
});

// Los formularios se ven solo al abrir su modal: no entran en el JS inicial de la pantalla y se
// precargan cuando el navegador queda libre (usePrecargar), asi el modal abre sin esperar.
const cargarFormularioAjusteStock = () => import("../../../src/components/modulos/stock/formulario-ajuste-stock").then((modulo) => modulo.FormularioAjusteStock);
const FormularioAjusteStock = dynamic(cargarFormularioAjusteStock, {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando formulario" />
});

const ESPERA_BUSQUEDA_MS = 300;

export default function StockPage() {
  usePrecargar(cargarFormularioAjusteStock);
  const modalAjuste = useModal<Existencia>();
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoStock | "">("");
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null);
  const refDetalle = useDesplazarAlDetalle(idSeleccionado);
  const [version, setVersion] = useState(0);
  const [cantidadBajoMinimo, setCantidadBajoMinimo] = useState<number | null>(null);

  // /stock?bajoMinimo=1 (desde los avisos del encabezado) abre con el filtro puesto.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("bajoMinimo") === "1") {
      setSoloBajoMinimo(true);
    }
  }, []);

  // La busqueda se aplica al dejar de escribir: filtra en la API.
  useEffect(() => {
    const espera = setTimeout(() => setBusquedaAplicada(busqueda.trim()), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(espera);
  }, [busqueda]);

  const listado = useListadoPaginado<Existencia>(
    (limit, offset) =>
      listarExistencias({
        activo: true,
        tipoItem: filtroTipo || undefined,
        soloBajoMinimo: soloBajoMinimo || undefined,
        busqueda: busquedaAplicada || undefined,
        limit,
        offset
      }),
    [filtroTipo, soloBajoMinimo, busquedaAplicada],
    "No fue posible cargar el stock"
  );
  const { items: existencias, cargando, error } = listado;
  const seleccionado = existencias.find((existencia) => existencia.idItemCatalogo === idSeleccionado) ?? null;

  // Cuantos items activos estan bajo el minimo (suelen ser pocos): para el rotulo del filtro.
  useEffect(() => {
    cargarTodo((limit, offset) => listarExistencias({ activo: true, soloBajoMinimo: true, limit, offset }))
      .then((bajos) => setCantidadBajoMinimo(bajos.length))
      .catch(() => setCantidadBajoMinimo(null));
  }, [version]);

  // Todas las existencias con los filtros aplicados, en tandas de 100 (el tope de la API). La
  // busqueda es la que esta escrita, aunque el listado todavia no la haya aplicado.
  async function exportarStock() {
    const todas = await cargarTodo((limit, offset) =>
      listarExistencias({
        activo: true,
        tipoItem: filtroTipo || undefined,
        soloBajoMinimo: soloBajoMinimo || undefined,
        busqueda: busqueda.trim() || undefined,
        limit,
        offset
      })
    );

    return generarCsv(
      ["Item", "Tipo", "Categoria", "Stock", "Minimo", "Estado", "Ultimo movimiento"],
      todas.map((existencia) => [
        existencia.nombre,
        formatearEstado(existencia.tipoItem),
        existencia.categoria?.nombre ?? "",
        numeroCsv(existencia.stockActual),
        numeroCsv(existencia.stockMinimo),
        existencia.bajoMinimo ? "Bajo minimo" : "OK",
        existencia.fechaUltimoMovimiento ? formatearFecha(existencia.fechaUltimoMovimiento).replace(", ", " ") : ""
      ])
    );
  }

  async function recargar() {
    await listado.recargar();
    setVersion((valor) => valor + 1);
  }

  async function registrarAjuste(payload: { tipoMovimiento: TipoAjuste; cantidad: number; observaciones: string }) {
    const existencia = modalAjuste.contexto;

    if (!existencia) {
      return;
    }

    await crearAjusteStock({
      idItemCatalogo: existencia.idItemCatalogo,
      tipoStock: existencia.tipoStock,
      ...payload
    });
    modalAjuste.cerrar();
    await recargar();
    setIdSeleccionado(existencia.idItemCatalogo);
    setAviso(`Ajuste registrado para ${existencia.nombre}.`);
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        descripcion="Existencias de productos e insumos, sus movimientos y ajustes manuales."
        filtros={
          <div className="filtros-inline">
            <input
              aria-label="Buscar item"
              className="control-filtro"
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o codigo"
              value={busqueda}
            />
            <select
              aria-label="Filtrar por tipo"
              className="control-filtro"
              onChange={(event) => setFiltroTipo(event.target.value as TipoStock | "")}
              value={filtroTipo}
            >
              <option value="">Productos e insumos</option>
              <option value="PRODUCTO">Productos</option>
              <option value="INSUMO">Insumos</option>
            </select>
            <label className="campo-checkbox" htmlFor="solo-bajo-minimo">
              <input
                checked={soloBajoMinimo}
                id="solo-bajo-minimo"
                onChange={(event) => setSoloBajoMinimo(event.target.checked)}
                type="checkbox"
              />
              <span>Solo bajo minimo{cantidadBajoMinimo === null ? "" : ` (${cantidadBajoMinimo})`}</span>
            </label>
            <BotonExportarCsv generar={exportarStock} nombre="stock" />
          </div>
        }
        titulo="Stock"
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {aviso ? <MensajeExito mensaje={aviso} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando stock" /> : null}
      {!cargando && !error && existencias.length === 0 ? (
        <EstadoVacio descripcion="No hay items para los filtros seleccionados." titulo="No encontramos items" />
      ) : null}

      {!cargando && existencias.length > 0 ? (
        <TablaDatos
          columns={[
            { header: "Item", cell: (existencia) => existencia.nombre },
            { header: "Tipo", cell: (existencia) => formatearEstado(existencia.tipoItem) },
            { header: "Categoria", cell: (existencia) => existencia.categoria?.nombre ?? "-" },
            { header: "Stock", cell: (existencia) => formatearCantidad(existencia.stockActual) },
            { header: "Minimo", cell: (existencia) => existencia.stockMinimo },
            { header: "Estado", cell: (existencia) => (existencia.bajoMinimo ? "Bajo minimo" : "OK") },
            { header: "Ultimo movimiento", cell: (existencia) => formatearFecha(existencia.fechaUltimoMovimiento) },
            {
              header: "Acciones",
              cell: (existencia) => (
                <div className="acciones-tabla">
                  <button
                    className="boton-secundario"
                    onClick={() => setIdSeleccionado(existencia.idItemCatalogo)}
                    type="button"
                  >
                    Movimientos
                  </button>
                  <button
                    className="boton-secundario"
                    onClick={() => {
                      setAviso(null);
                      modalAjuste.abrir(existencia);
                    }}
                    type="button"
                  >
                    Ajustar
                  </button>
                  {/* Solo productos: los insumos se compran. La orden se confirma en Produccion. */}
                  {existencia.tipoItem === "PRODUCTO" && existencia.bajoMinimo ? (
                    <Link
                      className="boton-secundario"
                      href={rutaOrdenParaReponer(
                        existencia.idItemCatalogo,
                        cantidadParaReponer(existencia.stockActual, existencia.stockMinimo)
                      )}
                    >
                      Crear orden de produccion
                    </Link>
                  ) : null}
                </div>
              )
            }
          ]}
          data={existencias}
          keyExtractor={(existencia) => existencia.idItemCatalogo}
        />
      ) : null}

      {!cargando ? (
        <PieListado
          cantidad={existencias.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
        />
      ) : null}

      {seleccionado ? (
        <div ref={refDetalle}>
          <PanelItemStock existencia={seleccionado} version={version} />
        </div>
      ) : null}

      <Modal
        abierto={modalAjuste.abierto}
        descripcion="Queda en el historial con tu usuario y el motivo."
        onClose={modalAjuste.cerrar}
        titulo="Ajustar stock"
      >
        {modalAjuste.contexto ? (
          <FormularioAjusteStock
            existencia={modalAjuste.contexto}
            onCancel={modalAjuste.cerrar}
            onSubmit={registrarAjuste}
          />
        ) : null}
      </Modal>
    </section>
  );
}
