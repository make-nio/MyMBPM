"use client";

import { useEffect, useState } from "react";

import { FormularioPedido } from "../../../src/components/modulos/pedidos/formulario-pedido";
import { PanelPedido } from "../../../src/components/modulos/pedidos/panel-pedido";
import { BotonExportarCsv } from "../../../src/components/ui/boton-exportar-csv";
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
import { generarCsv, numeroCsv } from "../../../src/lib/csv";
import { ENCABEZADOS_MODULO } from "../../../src/lib/encabezados-modulo";
import { formatearDia, formatearEstado, formatearFecha, formatearMoneda } from "../../../src/lib/formato";
import { crearPedido, listarPedidos } from "../../../src/lib/modulos/pedidos";
import { cargarTodo } from "../../../src/lib/paginacion";
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
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [idPedidoSeleccionado, setIdPedidoSeleccionado] = useState<string | null>(null);
  const refDetalle = useDesplazarAlDetalle(idPedidoSeleccionado);

  // /pedidos?pedido=ID abre ese pedido (por ejemplo, desde una solicitud convertida). Se lee al
  // montar: la web es un export estatico y la pagina es de cliente.
  useEffect(() => {
    const idPedido = new URLSearchParams(window.location.search).get("pedido");

    if (idPedido && /^\d+$/.test(idPedido)) {
      setIdPedidoSeleccionado(idPedido);
    }
  }, []);

  const rangoInvertido = desde !== "" && hasta !== "" && desde > hasta;
  const filtros = {
    estadoPedido: filtroEstado || undefined,
    estadoCobro: filtroCobro || undefined,
    desde: rangoInvertido ? undefined : desde || undefined,
    hasta: rangoInvertido ? undefined : hasta || undefined
  };

  const listado = useListadoPaginado<Pedido>(
    (limit, offset) => listarPedidos({ ...filtros, limit, offset }),
    [filtroEstado, filtroCobro, desde, hasta],
    "No fue posible cargar los pedidos"
  );
  const { items: pedidos, cargando, error, recargar } = listado;

  // Todos los pedidos con los filtros aplicados, no solo los cargados en pantalla.
  async function exportarPedidos() {
    const todos = await cargarTodo((limit, offset) => listarPedidos({ ...filtros, limit, offset }));

    return generarCsv(
      ["Numero", "Alta", "Cliente", "Estado", "Cobro", "Origen", "Entrega prometida", "Total"],
      todos.map((pedido) => [
        pedido.numeroPedido ?? pedido.idPedido,
        formatearFecha(pedido.fechaAlta).replace(", ", " "),
        `${pedido.cliente?.nombre ?? ""} ${pedido.cliente?.apellido ?? ""}`.trim(),
        formatearEstado(pedido.estadoPedido),
        formatearEstado(pedido.estadoCobro),
        formatearEstado(pedido.origenPedido),
        pedido.fechaEntrega ? formatearDia(pedido.fechaEntrega) : "",
        numeroCsv(pedido.total)
      ])
    );
  }

  async function guardarPedido(payload: PedidoAltaPayload) {
    const pedido = await crearPedido(payload);
    modalPedido.cerrar();
    await recargar();
    setIdPedidoSeleccionado(pedido.idPedido);
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        {...ENCABEZADOS_MODULO["/pedidos"]}
        botonLabel="Nuevo pedido"
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
            <label className="campo-filtro-fecha" htmlFor="pedidos-desde">
              <span>Alta desde</span>
              <input
                className="control-filtro"
                id="pedidos-desde"
                onChange={(event) => setDesde(event.target.value)}
                type="date"
                value={desde}
              />
            </label>
            <label className="campo-filtro-fecha" htmlFor="pedidos-hasta">
              <span>hasta</span>
              <input
                className="control-filtro"
                id="pedidos-hasta"
                onChange={(event) => setHasta(event.target.value)}
                type="date"
                value={hasta}
              />
            </label>
            <BotonExportarCsv generar={exportarPedidos} nombre="pedidos" />
          </div>
        }
        onCrear={() => modalPedido.abrir(null)}
      />

      {rangoInvertido ? <MensajeError mensaje="La fecha desde es posterior a la fecha hasta: no se aplica el rango." /> : null}
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
            { header: "Entrega", cell: (pedido) => formatearDia(pedido.fechaEntrega) },
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
          <PanelPedido
            idPedido={idPedidoSeleccionado}
            onAbrirPedido={setIdPedidoSeleccionado}
            onCambio={() => void recargar()}
          />
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
