"use client";

import { useState } from "react";

import { FormularioPedido } from "../../../src/components/modulos/pedidos/formulario-pedido";
import { PanelPedido } from "../../../src/components/modulos/pedidos/panel-pedido";
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
import { formatearEstado, formatearFecha, formatearMoneda } from "../../../src/lib/formato";
import { crearPedido, listarPedidos } from "../../../src/lib/modulos/pedidos";
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
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | "">("");
  const [filtroCobro, setFiltroCobro] = useState<EstadoCobro | "">("");
  const [idPedidoSeleccionado, setIdPedidoSeleccionado] = useState<string | null>(null);
  const refDetalle = useDesplazarAlDetalle(idPedidoSeleccionado);

  const listado = useListadoPaginado<Pedido>(
    (limit, offset) =>
      listarPedidos({
        estadoPedido: filtroEstado || undefined,
        estadoCobro: filtroCobro || undefined,
        limit,
        offset
      }),
    [filtroEstado, filtroCobro],
    "No fue posible cargar los pedidos"
  );
  const { items: pedidos, cargando, error, recargar } = listado;

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

      {!cargando ? (
        <PieListado
          cantidad={pedidos.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
        />
      ) : null}

      {idPedidoSeleccionado ? (
        <div ref={refDetalle}>
          <PanelPedido idPedido={idPedidoSeleccionado} onCambio={() => void recargar()} />
        </div>
      ) : null}

      <Modal
        abierto={modalPedido.abierto}
        descripcion="Primero la cabecera; despues agregas los productos desde el detalle."
        onClose={modalPedido.cerrar}
        titulo="Nuevo pedido"
      >
        <FormularioPedido onCancel={modalPedido.cerrar} onSubmit={guardarPedido} />
      </Modal>
    </section>
  );
}
