"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FormularioAjusteStock } from "../../../src/components/modulos/stock/formulario-ajuste-stock";
import { PanelItemStock } from "../../../src/components/modulos/stock/panel-item-stock";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { MensajeExito } from "../../../src/components/ui/mensaje-exito";
import { Modal } from "../../../src/components/ui/modal";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useModal } from "../../../src/hooks/use-modal";
import { formatearCantidad, formatearEstado, formatearFecha } from "../../../src/lib/formato";
import { crearAjusteStock, listarExistencias } from "../../../src/lib/modulos/stock";
import { Existencia, TipoAjuste, TipoStock } from "../../../src/types/stock";

export default function StockPage() {
  const modalAjuste = useModal<Existencia>();
  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoStock | "">("");
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(async () => {
    setExistencias(await listarExistencias({ activo: true }));
    setVersion((valor) => valor + 1);
  }, []);

  useEffect(() => {
    recargar()
      .catch((currentError) =>
        setError(currentError instanceof Error ? currentError.message : "No fue posible cargar el stock")
      )
      .finally(() => setCargando(false));
  }, [recargar]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return existencias.filter(
      (existencia) =>
        (!filtroTipo || existencia.tipoItem === filtroTipo) &&
        (!soloBajoMinimo || existencia.bajoMinimo) &&
        (!texto || existencia.nombre.toLowerCase().includes(texto))
    );
  }, [existencias, filtroTipo, soloBajoMinimo, busqueda]);

  const stockPorItem = useMemo(
    () => Object.fromEntries(existencias.map((existencia) => [existencia.idItemCatalogo, existencia.stockActual])),
    [existencias]
  );
  const seleccionado = existencias.find((existencia) => existencia.idItemCatalogo === idSeleccionado) ?? null;
  const cantidadBajoMinimo = existencias.filter((existencia) => existencia.bajoMinimo).length;

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
              placeholder="Buscar por nombre"
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
              <span>Solo bajo minimo ({cantidadBajoMinimo})</span>
            </label>
          </div>
        }
        titulo="Stock"
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {aviso ? <MensajeExito mensaje={aviso} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando stock" /> : null}
      {!cargando && !error && visibles.length === 0 ? (
        <EstadoVacio descripcion="No hay items para los filtros seleccionados." titulo="No encontramos items" />
      ) : null}

      {!cargando && visibles.length > 0 ? (
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
                </div>
              )
            }
          ]}
          data={visibles}
          keyExtractor={(existencia) => existencia.idItemCatalogo}
        />
      ) : null}

      {seleccionado ? <PanelItemStock existencia={seleccionado} stockPorItem={stockPorItem} version={version} /> : null}

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
