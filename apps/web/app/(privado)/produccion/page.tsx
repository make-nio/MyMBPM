"use client";

import { useCallback, useEffect, useState } from "react";

import { PanelOrden } from "../../../src/components/modulos/produccion/panel-orden";
import { CampoTexto } from "../../../src/components/formularios/campo-texto";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useModal } from "../../../src/hooks/use-modal";
import { formatearCantidad, formatearEstado, formatearFecha } from "../../../src/lib/formato";
import { listarItemsCatalogo } from "../../../src/lib/modulos/items-catalogo";
import { crearOrdenProduccion, listarOrdenesProduccion } from "../../../src/lib/modulos/produccion";
import { ItemCatalogo } from "../../../src/types/items-catalogo";
import { ESTADOS_PRODUCCION, EstadoProduccion, OrdenProduccion } from "../../../src/types/produccion";

export default function ProduccionPage() {
  const modalOrden = useModal();
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
  const [productos, setProductos] = useState<ItemCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoProduccion | "">("");
  const [idOrdenSeleccionada, setIdOrdenSeleccionada] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [creando, setCreando] = useState(false);

  const recargar = useCallback(async () => {
    setOrdenes(await listarOrdenesProduccion({ estadoProduccion: filtroEstado || undefined }));
  }, [filtroEstado]);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);

      try {
        await recargar();
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : "No fue posible cargar las ordenes");
      } finally {
        setCargando(false);
      }
    }

    void cargar();
  }, [recargar]);

  useEffect(() => {
    listarItemsCatalogo({ tipoItem: "PRODUCTO", activo: true })
      .then(setProductos)
      .catch(() => setError("No fue posible cargar los productos"));
  }, []);

  async function crearOrden() {
    setCreando(true);
    setError(null);

    try {
      const orden = await crearOrdenProduccion({ observaciones: observaciones || undefined });
      modalOrden.cerrar();
      setObservaciones("");
      await recargar();
      setIdOrdenSeleccionada(orden.idOrdenProduccion);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible crear la orden");
    } finally {
      setCreando(false);
    }
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        botonLabel="Nueva orden"
        descripcion="Planifica que fabricar, inicia la produccion para consumir insumos y finalizala para ingresar productos."
        filtros={
          <select
            aria-label="Filtrar por estado"
            className="control-filtro"
            onChange={(event) => setFiltroEstado(event.target.value as EstadoProduccion | "")}
            value={filtroEstado}
          >
            <option value="">Todos los estados</option>
            {ESTADOS_PRODUCCION.map((estado) => (
              <option key={estado} value={estado}>
                {formatearEstado(estado)}
              </option>
            ))}
          </select>
        }
        onCrear={() => modalOrden.abrir(null)}
        titulo="Produccion"
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando ordenes de produccion" /> : null}
      {!cargando && !error && ordenes.length === 0 ? (
        <EstadoVacio descripcion="No hay ordenes para el filtro seleccionado." titulo="No encontramos ordenes" />
      ) : null}

      {!cargando && ordenes.length > 0 ? (
        <TablaDatos
          columns={[
            { header: "Orden", cell: (orden) => `#${orden.idOrdenProduccion}` },
            { header: "Estado", cell: (orden) => formatearEstado(orden.estadoProduccion) },
            { header: "Alta", cell: (orden) => formatearFecha(orden.fechaAlta) },
            {
              header: "Productos",
              cell: (orden) =>
                (orden.detalles ?? []).length === 0
                  ? "-"
                  : `${orden.detalles?.length} (${formatearCantidad(
                      (orden.detalles ?? []).reduce((total, detalle) => total + Number(detalle.cantidad), 0)
                    )} u.)`
            },
            { header: "Observaciones", cell: (orden) => orden.observaciones || "-" },
            {
              header: "Acciones",
              cell: (orden) => (
                <button
                  className="boton-secundario"
                  onClick={() => setIdOrdenSeleccionada(orden.idOrdenProduccion)}
                  type="button"
                >
                  Ver
                </button>
              )
            }
          ]}
          data={ordenes}
          keyExtractor={(orden) => orden.idOrdenProduccion}
        />
      ) : null}

      {idOrdenSeleccionada ? (
        <PanelOrden idOrdenProduccion={idOrdenSeleccionada} onCambio={() => void recargar()} productos={productos} />
      ) : null}

      <Modal
        abierto={modalOrden.abierto}
        descripcion="Despues agregas los productos a fabricar desde el detalle."
        onClose={modalOrden.cerrar}
        titulo="Nueva orden"
      >
        <form
          className="formulario-modulo"
          onSubmit={(event) => {
            event.preventDefault();
            void crearOrden();
          }}
        >
          <CampoTexto id="orden-nueva-observaciones" label="Observaciones" onChange={setObservaciones} value={observaciones} />
          <div className="acciones-formulario">
            <button className="boton-secundario" onClick={modalOrden.cerrar} type="button">
              Cancelar
            </button>
            <button className="boton-primario" disabled={creando} type="submit">
              {creando ? "Creando..." : "Crear orden"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
