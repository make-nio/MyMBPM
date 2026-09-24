"use client";

import { useCallback, useEffect, useState } from "react";

import { EstadoCargando } from "../../ui/estado-cargando";
import { EstadoVacio } from "../../ui/estado-vacio";
import { MensajeError } from "../../ui/mensaje-error";
import { Modal } from "../../ui/modal";
import { TablaDatos } from "../../ui/tabla-datos";
import { useModal } from "../../../hooks/use-modal";
import { formatearCantidad, formatearEstado, formatearFecha } from "../../../lib/formato";
import { listarComponentesItem } from "../../../lib/modulos/items-catalogo";
import {
  actualizarDetalleOrden,
  agregarDetalleOrden,
  cancelarOrdenProduccion,
  eliminarDetalleOrden,
  finalizarOrdenProduccion,
  iniciarOrdenProduccion,
  obtenerOrdenProduccion
} from "../../../lib/modulos/produccion";
import { listarMovimientosStock, obtenerStockActual } from "../../../lib/modulos/stock";
import { calcularConsumosPrevistos } from "../../../lib/produccion/consumo-insumos";
import { calcularImpactoStock, hayStockInsuficiente, ImpactoStockItem } from "../../../lib/stock/impacto-stock";
import { OrdenProduccionCompleta, OrdenProduccionDetalle } from "../../../types/produccion";
import { MovimientoStock, TipoStock } from "../../../types/stock";
import { TablaImpactoStock } from "../stock/tabla-impacto-stock";
import { FormularioDetalleOrden } from "./formulario-detalle-orden";

export type AccionOrden = "iniciar" | "finalizar" | "cancelar";
type Accion = AccionOrden;

type PanelOrdenProps = {
  idOrdenProduccion: string;
  onCambio: () => void;
  // Desde el tablero: al cargar la orden abre el modal de esa accion (con su impacto en stock),
  // si todavia corresponde a su estado.
  accionInicial?: AccionOrden | null;
};

function accionValida(accion: AccionOrden, orden: OrdenProduccionCompleta) {
  if (accion === "iniciar") {
    return orden.estadoProduccion === "PENDIENTE" && (orden.detalles ?? []).length > 0;
  }
  if (accion === "finalizar") {
    return orden.estadoProduccion === "EN_PROCESO";
  }
  return orden.estadoProduccion === "PENDIENTE" || orden.estadoProduccion === "EN_PROCESO";
}
type MovimientoOrden = MovimientoStock & { nombreItem: string };

async function stockPorItem(ids: string[], tipoStock: TipoStock) {
  const stocks = await Promise.all(ids.map((id) => obtenerStockActual(id, tipoStock)));
  return Object.fromEntries(stocks.map((stock) => [stock.idItemCatalogo, stock.stockActual]));
}

// Movimientos que registro esta orden (egresos de insumos al iniciar, ingresos de productos al
// finalizar), leidos del historial de ESTADO_STOCK filtrado por la orden.
async function movimientosDeOrden(idOrden: string, items: Map<string, string>, tipoStock: TipoStock) {
  const historiales = await Promise.all(
    [...items.keys()].map((id) =>
      listarMovimientosStock({
        idItemCatalogo: id,
        tipoStock,
        origenMovimiento: "PRODUCCION",
        idReferenciaOrigen: idOrden,
        limit: 100
      })
    )
  );

  return historiales
    .flat()
    .map((movimiento) => ({ ...movimiento, nombreItem: items.get(movimiento.idItemCatalogo) ?? "-" }));
}

export function PanelOrden({ idOrdenProduccion, onCambio, accionInicial = null }: PanelOrdenProps) {
  const modalDetalle = useModal<OrdenProduccionDetalle>();
  const modalAccion = useModal<Accion>();
  const [orden, setOrden] = useState<OrdenProduccionCompleta | null>(null);
  const [consumoPrevisto, setConsumoPrevisto] = useState<ImpactoStockItem[]>([]);
  const [sinReceta, setSinReceta] = useState<string[]>([]);
  const [ingresoPrevisto, setIngresoPrevisto] = useState<ImpactoStockItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoOrden[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    const actual = await obtenerOrdenProduccion(idOrdenProduccion);
    const detalles = actual.detalles ?? [];
    const nombresProductos = new Map(
      detalles.map((detalle) => [detalle.idItemCatalogoProducto, detalle.itemCatalogoProducto?.nombre ?? "-"])
    );
    setOrden(actual);
    setConsumoPrevisto([]);
    setSinReceta([]);
    setIngresoPrevisto([]);
    setMovimientos([]);

    if (actual.estadoProduccion === "PENDIENTE" && detalles.length > 0) {
      // Antes de iniciar: que insumos consume la receta de cada producto y si alcanzan.
      const recetas = Object.fromEntries(
        await Promise.all(
          [...nombresProductos.keys()].map(async (id) => [
            id,
            (await listarComponentesItem(id)).map((componente) => ({
              idItemCatalogoHijo: componente.idItemCatalogoHijo,
              nombreInsumo: componente.itemCatalogoComponente?.nombre ?? "-",
              cantidadRequerida: componente.cantidadRequerida,
              activo: componente.activo
            }))
          ])
        )
      );
      const { egresos, productosSinReceta } = calcularConsumosPrevistos(
        detalles.map((detalle) => ({
          idItemCatalogoProducto: detalle.idItemCatalogoProducto,
          nombreProducto: nombresProductos.get(detalle.idItemCatalogoProducto) ?? "-",
          cantidad: detalle.cantidad
        })),
        recetas
      );
      const stock = await stockPorItem([...new Set(egresos.map((egreso) => egreso.idItemCatalogo))], "INSUMO");
      setConsumoPrevisto(calcularImpactoStock(egresos, stock));
      setSinReceta(productosSinReceta);
      return actual;
    }

    if (actual.estadoProduccion === "PENDIENTE") {
      return actual;
    }

    const insumos = new Map(
      (actual.consumos ?? []).map((consumo) => [consumo.idItemCatalogoInsumo, consumo.itemCatalogoInsumo?.nombre ?? "-"])
    );
    const [egresos, ingresos] = await Promise.all([
      movimientosDeOrden(idOrdenProduccion, insumos, "INSUMO"),
      movimientosDeOrden(idOrdenProduccion, nombresProductos, "PRODUCTO")
    ]);
    setMovimientos([...egresos, ...ingresos]);

    if (actual.estadoProduccion === "EN_PROCESO") {
      // Antes de finalizar: cuanto stock de producto se va a sumar.
      const stock = await stockPorItem([...nombresProductos.keys()], "PRODUCTO");
      setIngresoPrevisto(
        calcularImpactoStock(
          detalles.map((detalle) => ({
            idItemCatalogo: detalle.idItemCatalogoProducto,
            nombre: nombresProductos.get(detalle.idItemCatalogoProducto) ?? "-",
            cantidad: detalle.cantidad
          })),
          stock,
          "ingreso"
        )
      );
    }

    return actual;
  }, [idOrdenProduccion]);

  useEffect(() => {
    setOrden(null);
    setError(null);
    cargar()
      .then((actual) => {
        if (accionInicial && accionValida(accionInicial, actual)) {
          modalAccion.abrir(accionInicial);
        }
      })
      .catch((currentError) =>
        setError(currentError instanceof Error ? currentError.message : "No fue posible cargar la orden")
      );
    // modalAccion.abrir no cambia; la accion inicial se aplica una vez, al cargar la orden.
  }, [cargar, accionInicial]);

  async function ejecutar(accion: () => Promise<unknown>) {
    setError(null);

    try {
      await accion();
      await cargar();
      onCambio();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible completar la operacion");
    }
  }

  async function guardarDetalle(payload: { idItemCatalogoProducto: string; cantidad: number; observaciones?: string }) {
    if (modalDetalle.contexto) {
      await actualizarDetalleOrden(idOrdenProduccion, modalDetalle.contexto.idOrdenProduccionDetalle, {
        cantidad: payload.cantidad,
        observaciones: payload.observaciones
      });
    } else {
      await agregarDetalleOrden(idOrdenProduccion, payload);
    }

    modalDetalle.cerrar();
    await cargar();
    onCambio();
  }

  async function confirmarAccion() {
    const acciones: Record<Accion, () => Promise<unknown>> = {
      iniciar: () => iniciarOrdenProduccion(idOrdenProduccion),
      finalizar: () => finalizarOrdenProduccion(idOrdenProduccion),
      cancelar: () => cancelarOrdenProduccion(idOrdenProduccion)
    };
    const accion = modalAccion.contexto;

    if (!accion) {
      return;
    }

    setProcesando(true);
    await ejecutar(acciones[accion]);
    setProcesando(false);
    modalAccion.cerrar();
  }

  if (error && !orden) {
    return <MensajeError mensaje={error} />;
  }

  if (!orden) {
    return <EstadoCargando titulo="Cargando orden de produccion" />;
  }

  const detalles = orden.detalles ?? [];
  const pendiente = orden.estadoProduccion === "PENDIENTE";
  const enProceso = orden.estadoProduccion === "EN_PROCESO";
  const bloqueoInicio = sinReceta.length > 0 || hayStockInsuficiente(consumoPrevisto);
  const accion = modalAccion.contexto;

  return (
    <section aria-label={`Orden ${orden.idOrdenProduccion}`} className="tarjeta-seccion">
      <div className="tarjeta-seccion__encabezado">
        <div>
          <p className="marca-pequena">Orden de produccion</p>
          <h3>Orden #{orden.idOrdenProduccion}</h3>
          <p className="texto-secundario texto-secundario--compacto">
            Estado: <strong data-testid="estado-orden">{formatearEstado(orden.estadoProduccion)}</strong> · Alta:{" "}
            {formatearFecha(orden.fechaAlta)}
            {orden.fechaInicio ? ` · Inicio: ${formatearFecha(orden.fechaInicio)}` : ""}
            {orden.fechaFin ? ` · Fin: ${formatearFecha(orden.fechaFin)}` : ""}
          </p>
          {orden.observaciones ? <p className="texto-secundario texto-secundario--compacto">{orden.observaciones}</p> : null}
        </div>

        <div className="acciones-tabla">
          {pendiente ? (
            <>
              <button className="boton-secundario" onClick={() => modalDetalle.abrir(null)} type="button">
                Agregar producto
              </button>
              <button
                className="boton-primario"
                disabled={detalles.length === 0 || bloqueoInicio}
                onClick={() => modalAccion.abrir("iniciar")}
                type="button"
              >
                Iniciar produccion
              </button>
            </>
          ) : null}
          {enProceso ? (
            <button className="boton-primario" onClick={() => modalAccion.abrir("finalizar")} type="button">
              Finalizar produccion
            </button>
          ) : null}
          {pendiente || enProceso ? (
            <button className="boton-secundario" onClick={() => modalAccion.abrir("cancelar")} type="button">
              Cancelar orden
            </button>
          ) : null}
        </div>
      </div>

      {error ? <MensajeError mensaje={error} /> : null}

      {detalles.length === 0 ? (
        <EstadoVacio descripcion="Agrega los productos a fabricar." titulo="Orden sin productos" />
      ) : (
        <TablaDatos
          columns={[
            { header: "Producto", cell: (detalle) => detalle.itemCatalogoProducto?.nombre ?? "-" },
            { header: "Cantidad", cell: (detalle) => formatearCantidad(detalle.cantidad) },
            { header: "Observaciones", cell: (detalle) => detalle.observaciones || "-" },
            ...(pendiente
              ? [
                  {
                    header: "Acciones",
                    cell: (detalle: OrdenProduccionDetalle) => (
                      <div className="acciones-tabla">
                        <button className="boton-secundario" onClick={() => modalDetalle.abrir(detalle)} type="button">
                          Editar
                        </button>
                        <button
                          className="boton-secundario"
                          onClick={() =>
                            void ejecutar(() => eliminarDetalleOrden(idOrdenProduccion, detalle.idOrdenProduccionDetalle))
                          }
                          type="button"
                        >
                          Quitar
                        </button>
                      </div>
                    )
                  }
                ]
              : [])
          ]}
          data={detalles}
          keyExtractor={(detalle) => detalle.idOrdenProduccionDetalle}
        />
      )}

      {pendiente && detalles.length > 0 ? (
        <div aria-label="Consumo de insumos al iniciar" role="region">
          <p className="marca-pequena">Consumo de insumos al iniciar</p>
          {consumoPrevisto.length > 0 ? <TablaImpactoStock etiquetaItem="Insumo" impacto={consumoPrevisto} /> : null}
          {sinReceta.length > 0 ? (
            <MensajeError
              mensaje={`Sin receta activa: ${sinReceta.join(", ")}. Carga sus componentes en Items catalogo antes de iniciar.`}
            />
          ) : null}
          {hayStockInsuficiente(consumoPrevisto) ? (
            <MensajeError mensaje="No hay insumos suficientes para iniciar: ajusta las cantidades o ingresa stock primero." />
          ) : null}
        </div>
      ) : null}

      {enProceso && ingresoPrevisto.length > 0 ? (
        <div aria-label="Ingreso de productos al finalizar" role="region">
          <p className="marca-pequena">Ingreso de productos al finalizar</p>
          <TablaImpactoStock etiquetaItem="Producto" impacto={ingresoPrevisto} sentido="ingreso" />
        </div>
      ) : null}

      {!pendiente ? (
        <div aria-label="Movimientos de stock de la orden" role="region">
          <p className="marca-pequena">Movimientos de stock de la orden</p>
          {movimientos.length === 0 ? (
            <p className="texto-secundario">Esta orden no registro movimientos de stock.</p>
          ) : (
            <TablaDatos
              columns={[
                { header: "Item", cell: (movimiento) => movimiento.nombreItem },
                { header: "Tipo", cell: (movimiento) => formatearEstado(movimiento.tipoMovimiento) },
                { header: "Stock antes", cell: (movimiento) => formatearCantidad(movimiento.stockAnterior) },
                {
                  header: "Movimiento",
                  cell: (movimiento) =>
                    `${movimiento.tipoMovimiento.startsWith("EGRESO") ? "-" : "+"}${formatearCantidad(movimiento.cantidadMovimiento)}`
                },
                { header: "Stock despues", cell: (movimiento) => formatearCantidad(movimiento.stockActual) },
                {
                  header: "Registrado por",
                  cell: (movimiento) =>
                    movimiento.usuario ? `${movimiento.usuario.nombre} ${movimiento.usuario.apellido}` : "-"
                }
              ]}
              data={movimientos}
              keyExtractor={(movimiento) => movimiento.idEstadoStock}
            />
          )}
        </div>
      ) : null}

      <Modal
        abierto={modalDetalle.abierto}
        descripcion={modalDetalle.contexto ? "Cambia la cantidad u observaciones." : "Elegi un producto activo con receta."}
        onClose={modalDetalle.cerrar}
        titulo={modalDetalle.contexto ? "Editar producto" : "Agregar producto"}
      >
        <FormularioDetalleOrden
          detalle={modalDetalle.contexto}
          onCancel={modalDetalle.cerrar}
          onSubmit={guardarDetalle}
        />
      </Modal>

      <Modal
        abierto={modalAccion.abierto}
        descripcion={
          accion === "iniciar"
            ? "Se descuentan los insumos de la receta de cada producto. No se puede deshacer desde el panel."
            : accion === "finalizar"
              ? "Se suma al stock la cantidad fabricada de cada producto."
              : enProceso
                ? "La orden queda cancelada. Los insumos ya consumidos NO vuelven al stock."
                : "La orden queda cancelada y no se podra iniciar."
        }
        onClose={modalAccion.cerrar}
        titulo={accion === "iniciar" ? "Iniciar produccion" : accion === "finalizar" ? "Finalizar produccion" : "Cancelar orden"}
      >
        <div className="formulario-modulo">
          {accion === "iniciar" ? <TablaImpactoStock etiquetaItem="Insumo" impacto={consumoPrevisto} /> : null}
          {accion === "iniciar" && bloqueoInicio ? (
            <MensajeError
              mensaje={
                sinReceta.length > 0
                  ? `No se puede iniciar: ${sinReceta.join(", ")} no tiene receta.`
                  : "No se puede iniciar: faltan insumos."
              }
            />
          ) : null}
          {accion === "finalizar" ? (
            <TablaImpactoStock etiquetaItem="Producto" impacto={ingresoPrevisto} sentido="ingreso" />
          ) : null}
          <div className="acciones-formulario">
            <button className="boton-secundario" onClick={modalAccion.cerrar} type="button">
              Volver
            </button>
            <button
              className="boton-primario"
              disabled={procesando || (accion === "iniciar" && bloqueoInicio)}
              onClick={() => void confirmarAccion()}
              type="button"
            >
              {procesando
                ? "Procesando..."
                : accion === "iniciar"
                  ? "Iniciar y descontar insumos"
                  : accion === "finalizar"
                    ? "Finalizar e ingresar productos"
                    : "Cancelar orden"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
