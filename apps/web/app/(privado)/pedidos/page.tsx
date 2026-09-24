"use client";

import { useCallback, useEffect, useState } from "react";

import { FormularioPedido } from "../../../src/components/modulos/pedidos/formulario-pedido";
import { PanelPedido } from "../../../src/components/modulos/pedidos/panel-pedido";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useModal } from "../../../src/hooks/use-modal";
import { formatearEstado, formatearFecha, formatearMoneda } from "../../../src/lib/formato";
import { listarClientes } from "../../../src/lib/modulos/clientes";
import { listarItemsCatalogo } from "../../../src/lib/modulos/items-catalogo";
import { crearPedido, listarPedidos } from "../../../src/lib/modulos/pedidos";
import { Cliente } from "../../../src/types/clientes";
import { ItemCatalogo } from "../../../src/types/items-catalogo";
import {
  ESTADOS_COBRO,
  ESTADOS_PEDIDO,
  EstadoCobro,
  EstadoPedido,
  Pedido,
  PedidoAltaPayload
} from "../../../src/types/pedidos";

export default function PedidosPage() {
  const modalPedido = useModal();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<ItemCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | "">("");
  const [filtroCobro, setFiltroCobro] = useState<EstadoCobro | "">("");
  const [idPedidoSeleccionado, setIdPedidoSeleccionado] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setPedidos(
      await listarPedidos({
        estadoPedido: filtroEstado || undefined,
        estadoCobro: filtroCobro || undefined
      })
    );
  }, [filtroEstado, filtroCobro]);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);

      try {
        await recargar();
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : "No fue posible cargar los pedidos");
      } finally {
        setCargando(false);
      }
    }

    void cargar();
  }, [recargar]);

  useEffect(() => {
    // Datos para los formularios: clientes activos y productos activos del catalogo.
    Promise.all([listarClientes({ activo: true }), listarItemsCatalogo({ tipoItem: "PRODUCTO", activo: true })])
      .then(([clientesActivos, productosActivos]) => {
        setClientes(clientesActivos);
        setProductos(productosActivos);
      })
      .catch(() => setError("No fue posible cargar clientes y productos"));
  }, []);

  async function guardarPedido(payload: PedidoAltaPayload) {
    const pedido = await crearPedido(payload);
    modalPedido.cerrar();
    await recargar();
    setIdPedidoSeleccionado(pedido.idPedido);
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        botonLabel="Nuevo pedido"
        descripcion="Carga pedidos, confirmalos para descontar stock y segui su preparacion y cobro."
        filtros={
          <div className="filtros-inline">
            <select
              aria-label="Filtrar por estado"
              className="control-filtro"
              onChange={(event) => setFiltroEstado(event.target.value as EstadoPedido | "")}
              value={filtroEstado}
            >
              <option value="">Todos los estados</option>
              {ESTADOS_PEDIDO.map((estado) => (
                <option key={estado} value={estado}>
                  {formatearEstado(estado)}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por cobro"
              className="control-filtro"
              onChange={(event) => setFiltroCobro(event.target.value as EstadoCobro | "")}
              value={filtroCobro}
            >
              <option value="">Todos los cobros</option>
              {ESTADOS_COBRO.map((estado) => (
                <option key={estado} value={estado}>
                  {formatearEstado(estado)}
                </option>
              ))}
            </select>
          </div>
        }
        onCrear={() => modalPedido.abrir(null)}
        titulo="Pedidos"
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando pedidos" /> : null}
      {!cargando && !error && pedidos.length === 0 ? (
        <EstadoVacio descripcion="No hay pedidos para los filtros seleccionados." titulo="No encontramos pedidos" />
      ) : null}

      {!cargando && pedidos.length > 0 ? (
        <TablaDatos
          columns={[
            { header: "Numero", cell: (pedido) => pedido.numeroPedido ?? pedido.idPedido },
            {
              header: "Cliente",
              cell: (pedido) => `${pedido.cliente?.nombre ?? ""} ${pedido.cliente?.apellido ?? ""}`.trim() || "-"
            },
            { header: "Alta", cell: (pedido) => formatearFecha(pedido.fechaAlta) },
            { header: "Estado", cell: (pedido) => formatearEstado(pedido.estadoPedido) },
            { header: "Cobro", cell: (pedido) => formatearEstado(pedido.estadoCobro) },
            { header: "Total", cell: (pedido) => formatearMoneda(pedido.total) },
            {
              header: "Acciones",
              cell: (pedido) => (
                <button
                  className="boton-secundario"
                  onClick={() => setIdPedidoSeleccionado(pedido.idPedido)}
                  type="button"
                >
                  Ver
                </button>
              )
            }
          ]}
          data={pedidos}
          keyExtractor={(pedido) => pedido.idPedido}
        />
      ) : null}

      {idPedidoSeleccionado ? (
        <PanelPedido
          idPedido={idPedidoSeleccionado}
          onCambio={() => void recargar()}
          productos={productos}
        />
      ) : null}

      <Modal
        abierto={modalPedido.abierto}
        descripcion="Primero la cabecera; despues agregas los productos desde el detalle."
        onClose={modalPedido.cerrar}
        titulo="Nuevo pedido"
      >
        <FormularioPedido clientes={clientes} onCancel={modalPedido.cerrar} onSubmit={guardarPedido} />
      </Modal>
    </section>
  );
}
