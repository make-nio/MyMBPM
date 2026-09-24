"use client";

import { useCallback, useEffect, useState } from "react";

import { EstadoCargando } from "../../ui/estado-cargando";
import { EstadoVacio } from "../../ui/estado-vacio";
import { MensajeError } from "../../ui/mensaje-error";
import { Modal } from "../../ui/modal";
import { TablaDatos } from "../../ui/tabla-datos";
import { useModal } from "../../../hooks/use-modal";
import {
  diaArgentina,
  formatearCantidad,
  formatearDia,
  formatearEstado,
  formatearFecha,
  formatearMoneda
} from "../../../lib/formato";
import { calcularMargenPedido } from "../../../lib/costos";
import { useUsuarioAutenticado } from "../../auth/contexto-sesion";
import {
  actualizarDetallePedido,
  actualizarEstadoPedido,
  agregarDetallePedido,
  confirmarPedido,
  eliminarDetallePedido,
  obtenerPedido
} from "../../../lib/modulos/pedidos";
import { listarMovimientosStock, obtenerStockActual } from "../../../lib/modulos/stock";
import { calcularImpactoStock, hayStockInsuficiente, ImpactoStockItem } from "../../../lib/stock/impacto-stock";
import {
  ESTADOS_COBRO,
  TRANSICIONES_ESTADO_PEDIDO,
  EstadoCobro,
  EstadoPedido,
  Pedido,
  PedidoDetalle
} from "../../../types/pedidos";
import { MovimientoStock } from "../../../types/stock";
import { TablaImpactoStock } from "../stock/tabla-impacto-stock";
import { FormularioLineaPedido } from "./formulario-linea-pedido";

type PanelPedidoProps = {
  idPedido: string;
  onCambio: () => void;
};

type MovimientoPedido = MovimientoStock & { nombreItem: string };

function itemsDistintos(detalles: PedidoDetalle[]) {
  return [...new Set(detalles.map((detalle) => detalle.idItemCatalogo))];
}

// Detalle de un pedido: lineas, confirmacion con su impacto en el stock y cambios de estado.
export function PanelPedido({ idPedido, onCambio }: PanelPedidoProps) {
  const { esAdministrador } = useUsuarioAutenticado();
  const modalLinea = useModal<PedidoDetalle>();
  const modalConfirmacion = useModal();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [impacto, setImpacto] = useState<ImpactoStockItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoPedido[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [estadoPedido, setEstadoPedido] = useState<EstadoPedido>("PENDIENTE");
  const [estadoCobro, setEstadoCobro] = useState<EstadoCobro>("PENDIENTE");
  const [fechaEntrega, setFechaEntrega] = useState("");

  const cargar = useCallback(async () => {
    const actual = await obtenerPedido(idPedido);
    const detalles = actual.detalles ?? [];
    setPedido(actual);
    setEstadoPedido(actual.estadoPedido);
    setEstadoCobro(actual.estadoCobro);
    setFechaEntrega(diaArgentina(actual.fechaEntrega));

    if (actual.estadoPedido === "PENDIENTE") {
      // Antes de confirmar: cuanto stock hay y cuanto quedaria.
      const stocks = await Promise.all(
        itemsDistintos(detalles).map((id) => obtenerStockActual(id, "PRODUCTO"))
      );
      setImpacto(
        calcularImpactoStock(
          detalles.map((detalle) => ({
            idItemCatalogo: detalle.idItemCatalogo,
            nombre: detalle.nombreItemSnapshot,
            cantidad: detalle.cantidad
          })),
          Object.fromEntries(stocks.map((stock) => [stock.idItemCatalogo, stock.stockActual]))
        )
      );
      setMovimientos([]);
      return;
    }

    // Despues de confirmar: los egresos que registro la confirmacion de este pedido.
    const historiales = await Promise.all(
      itemsDistintos(detalles).map((id) =>
        listarMovimientosStock({
          idItemCatalogo: id,
          tipoStock: "PRODUCTO",
          origenMovimiento: "PEDIDO",
          idReferenciaOrigen: idPedido,
          limit: 100
        })
      )
    );
    const nombres = new Map(detalles.map((detalle) => [detalle.idItemCatalogo, detalle.nombreItemSnapshot]));
    setMovimientos(
      historiales
        .flat()
        .map((movimiento) => ({ ...movimiento, nombreItem: nombres.get(movimiento.idItemCatalogo) ?? "-" }))
    );
    setImpacto([]);
  }, [idPedido]);

  useEffect(() => {
    setPedido(null);
    setError(null);
    cargar().catch((currentError) =>
      setError(currentError instanceof Error ? currentError.message : "No fue posible cargar el pedido")
    );
  }, [cargar]);

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

  async function guardarLinea(payload: { idItemCatalogo: string; cantidad: number }) {
    if (modalLinea.contexto) {
      await actualizarDetallePedido(idPedido, modalLinea.contexto.idPedidoDetalle, payload.cantidad);
    } else {
      await agregarDetallePedido(idPedido, payload);
    }

    modalLinea.cerrar();
    await cargar();
    onCambio();
  }

  async function confirmar() {
    setConfirmando(true);
    await ejecutar(() => confirmarPedido(idPedido));
    setConfirmando(false);
    modalConfirmacion.cerrar();
  }

  if (error && !pedido) {
    return <MensajeError mensaje={error} />;
  }

  if (!pedido) {
    return <EstadoCargando titulo="Cargando pedido" />;
  }

  const detalles = pedido.detalles ?? [];
  const margen = calcularMargenPedido(pedido.total, detalles);
  const pendiente = pedido.estadoPedido === "PENDIENTE";
  const insuficiente = hayStockInsuficiente(impacto);
  // La fecha prometida se puede cambiar mientras el pedido no se entrego ni se cancelo.
  const abierto = pedido.estadoPedido !== "ENTREGADO" && pedido.estadoPedido !== "CANCELADO";
  const atrasado = abierto && pedido.fechaEntrega !== null && diaArgentina(pedido.fechaEntrega) < diaArgentina(new Date());
  const opcionesEstado: EstadoPedido[] = [pedido.estadoPedido, ...TRANSICIONES_ESTADO_PEDIDO[pedido.estadoPedido]];

  return (
    <section aria-label={`Pedido ${pedido.numeroPedido ?? pedido.idPedido}`} className="tarjeta-seccion">
      <div className="tarjeta-seccion__encabezado">
        <div>
          <p className="marca-pequena">Detalle del pedido</p>
          <h3>{pedido.numeroPedido ?? `Pedido ${pedido.idPedido}`}</h3>
          <p className="texto-secundario texto-secundario--compacto">
            Cliente: {`${pedido.cliente?.nombre ?? ""} ${pedido.cliente?.apellido ?? ""}`.trim() || "-"} · Origen:{" "}
            {formatearEstado(pedido.origenPedido)} · Alta: {formatearFecha(pedido.fechaAlta)}
            {pedido.fechaConfirmacion ? ` · Confirmado: ${formatearFecha(pedido.fechaConfirmacion)}` : ""}
          </p>
          <p className="texto-secundario texto-secundario--compacto">
            Entrega prometida:{" "}
            <strong data-testid="entrega-prometida">
              {pedido.fechaEntrega ? formatearDia(pedido.fechaEntrega) : "sin fecha"}
            </strong>
            {atrasado ? <strong className="texto-alerta" data-testid="pedido-atrasado"> · Atrasado</strong> : null}
          </p>
          <p className="texto-secundario texto-secundario--compacto">
            Estado: <strong data-testid="estado-pedido">{formatearEstado(pedido.estadoPedido)}</strong> · Cobro:{" "}
            <strong>{formatearEstado(pedido.estadoCobro)}</strong> · Total:{" "}
            <strong data-testid="total-pedido">{formatearMoneda(pedido.total)}</strong>
          </p>
          {esAdministrador && detalles.length > 0 && detalles.every((detalle) => detalle.costoUnitario !== undefined) ? (
            <p className="texto-secundario texto-secundario--compacto">
              Costo: <strong data-testid="costo-pedido">{formatearMoneda(margen.costo)}</strong> · Ganancia:{" "}
              <strong data-testid="ganancia-pedido">{formatearMoneda(margen.ganancia)}</strong>
              {margen.porcentaje === null ? null : ` (${margen.porcentaje}%)`}
              {margen.lineasSinCosto > 0
                ? ` · ${margen.lineasSinCosto} ${margen.lineasSinCosto === 1 ? "item sin costo cargado" : "items sin costo cargado"}`
                : null}
            </p>
          ) : null}
        </div>

        {pendiente ? (
          <div className="acciones-tabla">
            <button className="boton-secundario" onClick={() => modalLinea.abrir(null)} type="button">
              Agregar item
            </button>
            <button
              className="boton-primario"
              disabled={detalles.length === 0}
              onClick={() => modalConfirmacion.abrir(null)}
              type="button"
            >
              Confirmar pedido
            </button>
          </div>
        ) : null}
      </div>

      {error ? <MensajeError mensaje={error} /> : null}

      {detalles.length === 0 ? (
        <EstadoVacio descripcion="Agrega productos del catalogo para poder confirmarlo." titulo="Pedido sin items" />
      ) : (
        <TablaDatos
          columns={[
            { header: "Item", cell: (detalle) => detalle.nombreItemSnapshot },
            { header: "Cantidad", cell: (detalle) => formatearCantidad(detalle.cantidad) },
            { header: "Precio unitario", cell: (detalle) => formatearMoneda(detalle.precioUnitario) },
            { header: "Subtotal", cell: (detalle) => formatearMoneda(detalle.subtotal) },
            ...(pendiente
              ? [
                  {
                    header: "Acciones",
                    cell: (detalle: PedidoDetalle) => (
                      <div className="acciones-tabla">
                        <button className="boton-secundario" onClick={() => modalLinea.abrir(detalle)} type="button">
                          Editar
                        </button>
                        <button
                          className="boton-secundario"
                          onClick={() => void ejecutar(() => eliminarDetallePedido(idPedido, detalle.idPedidoDetalle))}
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
          keyExtractor={(detalle) => detalle.idPedidoDetalle}
        />
      )}

      {pendiente && impacto.length > 0 ? (
        <div aria-label="Impacto en stock al confirmar" role="region">
          <p className="marca-pequena">Impacto en stock al confirmar</p>
          <TablaImpactoStock etiquetaItem="Producto" impacto={impacto} />
          {insuficiente ? (
            <MensajeError mensaje="No hay stock suficiente para confirmar: ajusta las cantidades o produce/ingresa stock primero." />
          ) : null}
        </div>
      ) : null}

      {!pendiente ? (
        <div aria-label="Movimientos de stock del pedido" role="region">
          <p className="marca-pequena">Movimientos de stock del pedido</p>
          {movimientos.length === 0 ? (
            <p className="texto-secundario">Este pedido no registro movimientos de stock.</p>
          ) : (
            <TablaDatos
              columns={[
                { header: "Item", cell: (movimiento) => movimiento.nombreItem },
                { header: "Stock antes", cell: (movimiento) => formatearCantidad(movimiento.stockAnterior) },
                { header: "Egreso", cell: (movimiento) => `-${formatearCantidad(movimiento.cantidadMovimiento)}` },
                { header: "Stock despues", cell: (movimiento) => formatearCantidad(movimiento.stockActual) },
                {
                  header: "Registrado por",
                  cell: (movimiento) =>
                    movimiento.usuario ? `${movimiento.usuario.nombre} ${movimiento.usuario.apellido}` : "-"
                },
                { header: "Fecha", cell: (movimiento) => formatearFecha(movimiento.fechaAlta) }
              ]}
              data={movimientos}
              keyExtractor={(movimiento) => movimiento.idEstadoStock}
            />
          )}
        </div>
      ) : null}

      <div className="filtros-inline">
        <label className="campo-formulario" htmlFor="pedido-estado">
          <span>Estado del pedido</span>
          <select
            disabled={opcionesEstado.length === 1}
            id="pedido-estado"
            onChange={(event) => setEstadoPedido(event.target.value as EstadoPedido)}
            value={estadoPedido}
          >
            {opcionesEstado.map((estado) => (
              <option key={estado} value={estado}>
                {formatearEstado(estado)}
              </option>
            ))}
          </select>
        </label>
        <label className="campo-formulario" htmlFor="pedido-estado-cobro">
          <span>Cobro</span>
          <select
            id="pedido-estado-cobro"
            onChange={(event) => setEstadoCobro(event.target.value as EstadoCobro)}
            value={estadoCobro}
          >
            {ESTADOS_COBRO.map((estado) => (
              <option key={estado} value={estado}>
                {formatearEstado(estado)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="boton-secundario"
          disabled={estadoPedido === pedido.estadoPedido && estadoCobro === pedido.estadoCobro}
          onClick={() =>
            void ejecutar(() =>
              actualizarEstadoPedido(idPedido, {
                estadoPedido: estadoPedido === pedido.estadoPedido ? undefined : estadoPedido,
                estadoCobro
              })
            )
          }
          type="button"
        >
          Guardar estado
        </button>
      </div>
      {abierto ? (
        <div className="filtros-inline">
          <label className="campo-formulario" htmlFor="pedido-fecha-entrega-edicion">
            <span>Entrega prometida</span>
            <input
              id="pedido-fecha-entrega-edicion"
              onChange={(event) => setFechaEntrega(event.target.value)}
              type="date"
              value={fechaEntrega}
            />
          </label>
          <button
            className="boton-secundario"
            disabled={fechaEntrega === diaArgentina(pedido.fechaEntrega)}
            onClick={() => void ejecutar(() => actualizarEstadoPedido(idPedido, { fechaEntrega: fechaEntrega || null }))}
            type="button"
          >
            Guardar fecha
          </button>
        </div>
      ) : null}
      {estadoPedido === "CANCELADO" && pedido.estadoPedido !== "PENDIENTE" && pedido.estadoPedido !== "CANCELADO" ? (
        <p className="texto-secundario">
          Cancelar un pedido confirmado no devuelve el stock descontado: si corresponde, ajustalo desde Stock.
        </p>
      ) : null}

      <Modal
        abierto={modalLinea.abierto}
        descripcion={modalLinea.contexto ? "Cambia la cantidad de la linea." : "Elegi un producto activo del catalogo."}
        onClose={modalLinea.cerrar}
        titulo={modalLinea.contexto ? "Editar item" : "Agregar item"}
      >
        <FormularioLineaPedido
          linea={modalLinea.contexto}
          onCancel={modalLinea.cerrar}
          onSubmit={guardarLinea}
        />
      </Modal>

      <Modal
        abierto={modalConfirmacion.abierto}
        descripcion="Al confirmar se descuenta el stock de cada producto. No se puede deshacer desde el panel."
        onClose={modalConfirmacion.cerrar}
        titulo="Confirmar pedido"
      >
        <div className="formulario-modulo">
          <TablaImpactoStock etiquetaItem="Producto" impacto={impacto} />
          {insuficiente ? <MensajeError mensaje="Hay productos sin stock suficiente." /> : null}
          <div className="acciones-formulario">
            <button className="boton-secundario" onClick={modalConfirmacion.cerrar} type="button">
              Cancelar
            </button>
            <button
              className="boton-primario"
              disabled={confirmando || insuficiente}
              onClick={() => void confirmar()}
              type="button"
            >
              {confirmando ? "Confirmando..." : "Confirmar y descontar stock"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
