"use client";

import { useEffect, useState } from "react";

import { AccionOrden, PanelOrden } from "../../../src/components/modulos/produccion/panel-orden";
import { TableroProduccion } from "../../../src/components/modulos/produccion/tablero-produccion";
import { CampoTexto } from "../../../src/components/formularios/campo-texto";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { PieListado } from "../../../src/components/ui/pie-listado";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useDesplazarAlDetalle } from "../../../src/hooks/use-desplazar-al-detalle";
import { useListadoPaginado } from "../../../src/hooks/use-listado-paginado";
import { useModal } from "../../../src/hooks/use-modal";
import { formatearCantidad, formatearEstado, formatearFecha } from "../../../src/lib/formato";
import { obtenerItemCatalogo } from "../../../src/lib/modulos/items-catalogo";
import { agregarDetalleOrden, crearOrdenProduccion, listarOrdenesProduccion } from "../../../src/lib/modulos/produccion";
import { leerOrdenParaReponer } from "../../../src/lib/stock/reponer";
import { ESTADOS_PRODUCCION, EstadoProduccion, OrdenProduccion } from "../../../src/types/produccion";

export default function ProduccionPage() {
  const modalOrden = useModal();
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoProduccion | "">("");
  const [idOrdenSeleccionada, setIdOrdenSeleccionada] = useState<string | null>(null);
  // Desde el tablero, la accion con la que se abre el detalle; la clave lo vuelve a montar (y a
  // bajar hasta el) aunque se elija otra vez la misma orden.
  const [accionInicial, setAccionInicial] = useState<AccionOrden | null>(null);
  const [claveDetalle, setClaveDetalle] = useState(0);
  const refDetalle = useDesplazarAlDetalle(idOrdenSeleccionada ? `${idOrdenSeleccionada}-${claveDetalle}` : null);
  const [vista, setVista] = useState<"lista" | "tablero">("lista");
  const [versionTablero, setVersionTablero] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [creando, setCreando] = useState(false);
  // Producto y cantidad propuestos desde Stock ("Crear orden de produccion"): prellenan el alta,
  // pero la orden se crea solo cuando la persona la confirma.
  const [productoPropuesto, setProductoPropuesto] = useState<{ idItemCatalogo: string; nombre: string } | null>(null);
  const [cantidadPropuesta, setCantidadPropuesta] = useState("");

  // /produccion?vista=tablero abre directo el tablero.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("vista") === "tablero") {
      setVista("tablero");
    }
  }, []);

  function abrirOrden(idOrden: string, accion: AccionOrden | null = null) {
    setIdOrdenSeleccionada(idOrden);
    setAccionInicial(accion);
    setClaveDetalle((clave) => clave + 1);
  }

  useEffect(() => {
    const propuesta = leerOrdenParaReponer(window.location.search);

    if (!propuesta) {
      return;
    }

    // Sin los parametros en la direccion: recargar la pagina no vuelve a abrir el alta.
    window.history.replaceState(null, "", window.location.pathname);
    obtenerItemCatalogo(propuesta.idItemCatalogo)
      .then((item) => {
        setProductoPropuesto({ idItemCatalogo: item.idItemCatalogo, nombre: item.nombre });
        setCantidadPropuesta(String(propuesta.cantidad));
        setObservaciones(`Reponer stock minimo de ${item.nombre}`);
        modalOrden.abrir(null);
      })
      .catch((causa: unknown) =>
        setErrorAlta(causa instanceof Error ? causa.message : "No fue posible cargar el producto a reponer")
      );
    // Solo al montar: la propuesta viene en la direccion con la que se abrio la pantalla.
  }, []);

  function cerrarAlta() {
    modalOrden.cerrar();
    setErrorAlta(null);
    setProductoPropuesto(null);
    setCantidadPropuesta("");
    setObservaciones("");
  }

  const listado = useListadoPaginado<OrdenProduccion>(
    (limit, offset) => listarOrdenesProduccion({ estadoProduccion: filtroEstado || undefined, limit, offset }),
    [filtroEstado],
    "No fue posible cargar las ordenes"
  );
  const { items: ordenes, cargando, recargar } = listado;
  // Con el alta abierta, su error se muestra adentro del modal.
  const error = listado.error ?? (modalOrden.abierto ? null : errorAlta);

  async function crearOrden() {
    setCreando(true);
    setErrorAlta(null);

    let idOrden: string | null = null;

    if (productoPropuesto && !(Number(cantidadPropuesta) > 0)) {
      setErrorAlta("La cantidad a producir tiene que ser mayor que cero");
      setCreando(false);
      return;
    }

    try {
      const orden = await crearOrdenProduccion({ observaciones: observaciones || undefined });
      idOrden = orden.idOrdenProduccion;

      if (productoPropuesto) {
        await agregarDetalleOrden(orden.idOrdenProduccion, {
          idItemCatalogoProducto: productoPropuesto.idItemCatalogo,
          cantidad: Number(cantidadPropuesta)
        });
      }

      cerrarAlta();
      await recargar();
      setVersionTablero((valor) => valor + 1);
      abrirOrden(orden.idOrdenProduccion);
    } catch (currentError) {
      // Si la orden se creo pero no el producto, queda a la vista para completarla a mano.
      if (idOrden) {
        cerrarAlta();
        await recargar();
        setVersionTablero((valor) => valor + 1);
        abrirOrden(idOrden);
      }

      setErrorAlta(currentError instanceof Error ? currentError.message : "No fue posible crear la orden");
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
          <div className="filtros-inline">
            <div aria-label="Vista" className="selector-vista" role="group">
              {(["lista", "tablero"] as const).map((opcion) => (
                <button
                  aria-pressed={vista === opcion}
                  className={vista === opcion ? "boton-primario" : "boton-secundario"}
                  key={opcion}
                  onClick={() => setVista(opcion)}
                  type="button"
                >
                  {opcion === "lista" ? "Lista" : "Tablero"}
                </button>
              ))}
            </div>
            {vista === "lista" ? (
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
            ) : null}
          </div>
        }
        onCrear={() => {
          setProductoPropuesto(null);
          modalOrden.abrir(null);
        }}
        titulo="Produccion"
      />

      {vista === "tablero" && errorAlta && !modalOrden.abierto ? <MensajeError mensaje={errorAlta} /> : null}
      {vista === "tablero" ? <TableroProduccion onElegir={abrirOrden} version={versionTablero} /> : null}

      {vista === "lista" && error ? <MensajeError mensaje={error} /> : null}
      {vista === "lista" && cargando ? <EstadoCargando titulo="Cargando ordenes de produccion" /> : null}
      {vista === "lista" && !cargando && !error && ordenes.length === 0 ? (
        <EstadoVacio descripcion="No hay ordenes para el filtro seleccionado." titulo="No encontramos ordenes" />
      ) : null}

      {vista === "lista" && !cargando && ordenes.length > 0 ? (
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
                  onClick={() => abrirOrden(orden.idOrdenProduccion)}
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

      {vista === "lista" && !cargando ? (
        <PieListado
          cantidad={ordenes.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
        />
      ) : null}

      {idOrdenSeleccionada ? (
        <div ref={refDetalle}>
          <PanelOrden
            accionInicial={accionInicial}
            idOrdenProduccion={idOrdenSeleccionada}
            key={`${idOrdenSeleccionada}-${claveDetalle}`}
            onCambio={() => {
              void recargar();
              setVersionTablero((valor) => valor + 1);
            }}
          />
        </div>
      ) : null}

      <Modal
        abierto={modalOrden.abierto}
        descripcion={
          productoPropuesto
            ? "Propuesta para volver al stock minimo. Revisa la cantidad: la orden se crea recien al confirmar."
            : "Despues agregas los productos a fabricar desde el detalle."
        }
        onClose={cerrarAlta}
        titulo="Nueva orden"
      >
        <form
          className="formulario-modulo"
          onSubmit={(event) => {
            event.preventDefault();
            void crearOrden();
          }}
        >
          {errorAlta ? <MensajeError mensaje={errorAlta} /> : null}
          {productoPropuesto ? (
            <>
              <p data-testid="producto-propuesto">
                Producto: <strong>{productoPropuesto.nombre}</strong>
              </p>
              <CampoTexto
                id="orden-nueva-cantidad"
                label="Cantidad a producir"
                onChange={setCantidadPropuesta}
                required
                step="1"
                type="number"
                value={cantidadPropuesta}
              />
            </>
          ) : null}
          <CampoTexto id="orden-nueva-observaciones" label="Observaciones" onChange={setObservaciones} value={observaciones} />
          <div className="acciones-formulario">
            <button className="boton-secundario" onClick={cerrarAlta} type="button">
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
