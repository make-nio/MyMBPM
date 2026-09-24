"use client";

import Link from "next/link";
import { useState } from "react";

import { FormularioSolicitudEspecial } from "../../../src/components/modulos/solicitudes-especiales/formulario-solicitud-especial";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { MensajeExito } from "../../../src/components/ui/mensaje-exito";
import { Modal } from "../../../src/components/ui/modal";
import { PieListado } from "../../../src/components/ui/pie-listado";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useListadoPaginado } from "../../../src/hooks/use-listado-paginado";
import { useModal } from "../../../src/hooks/use-modal";
import { ENCABEZADOS_MODULO } from "../../../src/lib/encabezados-modulo";
import {
  actualizarSolicitudEspecial,
  cambiarEstadoSolicitudEspecial,
  convertirSolicitudEnPedido,
  crearSolicitudEspecial,
  listarSolicitudesEspeciales
} from "../../../src/lib/modulos/solicitudes-especiales";
import {
  ESTADOS_CONVERTIBLES,
  ESTADOS_SOLICITUD,
  EstadoSolicitud,
  SolicitudEspecial
} from "../../../src/types/solicitudes-especiales";

type ContextoSolicitudModal =
  | { modo: "crear"; solicitud: null }
  | { modo: "editar"; solicitud: SolicitudEspecial }
  | { modo: "estado"; solicitud: SolicitudEspecial }
  | { modo: "convertir"; solicitud: SolicitudEspecial };

export default function SolicitudesEspecialesPage() {
  const modalSolicitud = useModal<ContextoSolicitudModal>();
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [estadoTemporal, setEstadoTemporal] = useState<EstadoSolicitud>("PENDIENTE");

  const listado = useListadoPaginado<SolicitudEspecial>(
    (limit, offset) =>
      listarSolicitudesEspeciales({
        estadoSolicitud: estadoFiltro === "todos" ? undefined : (estadoFiltro as EstadoSolicitud),
        limit,
        offset
      }),
    [estadoFiltro],
    "No fue posible cargar las solicitudes"
  );
  const { items: solicitudes, cargando, error, recargar } = listado;

  async function guardarSolicitud(payload: Parameters<typeof crearSolicitudEspecial>[0]) {
    const contexto = modalSolicitud.contexto;

    if (contexto?.modo === "editar" && contexto.solicitud) {
      await actualizarSolicitudEspecial(contexto.solicitud.idSolicitudEspecial, payload);
    } else {
      await crearSolicitudEspecial(payload);
    }

    modalSolicitud.cerrar();
    await recargar();
  }

  const [convertido, setConvertido] = useState<{ idPedido: string; numeroPedido: string | null } | null>(null);
  const [errorConversion, setErrorConversion] = useState<string | null>(null);
  const [convirtiendo, setConvirtiendo] = useState(false);

  async function convertir() {
    const contexto = modalSolicitud.contexto;

    if (!contexto || contexto.modo !== "convertir") {
      return;
    }

    setConvirtiendo(true);
    setErrorConversion(null);

    try {
      setConvertido(await convertirSolicitudEnPedido(contexto.solicitud.idSolicitudEspecial));
      modalSolicitud.cerrar();
      await recargar();
    } catch (currentError) {
      setErrorConversion(currentError instanceof Error ? currentError.message : "No fue posible convertir la solicitud");
    } finally {
      setConvirtiendo(false);
    }
  }

  async function guardarEstado() {
    const contexto = modalSolicitud.contexto;

    if (!contexto || contexto.modo !== "estado") {
      return;
    }

    await cambiarEstadoSolicitudEspecial(
      contexto.solicitud.idSolicitudEspecial,
      estadoTemporal
    );

    modalSolicitud.cerrar();
    await recargar();
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        {...ENCABEZADOS_MODULO["/solicitudes-especiales"]}
        botonLabel="Nueva solicitud"
        filtros={
          <select
            aria-label="Filtrar por estado"
            className="control-filtro"
            onChange={(event) => setEstadoFiltro(event.target.value)}
            value={estadoFiltro}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS_SOLICITUD.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        }
        onCrear={() => modalSolicitud.abrir({ modo: "crear", solicitud: null })}
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando solicitudes especiales" /> : null}
      {!cargando && !error && solicitudes.length === 0 ? (
        <EstadoVacio
          descripcion="Todavia no hay solicitudes registradas con el filtro actual."
          titulo="No encontramos solicitudes"
        />
      ) : null}

      {!cargando && !error && solicitudes.length > 0 ? (
        <TablaDatos
          columns={[
            {
              header: "Solicitante",
              cell: (solicitud) => solicitud.nombreSolicitante
            },
            {
              header: "Cliente",
              cell: (solicitud) =>
                solicitud.cliente
                  ? `${solicitud.cliente.nombre} ${solicitud.cliente.apellido ?? ""}`.trim()
                  : "Sin cliente"
            },
            {
              header: "Estado",
              cell: (solicitud) => solicitud.estadoSolicitud
            },
            {
              header: "Pedido",
              cell: (solicitud) =>
                solicitud.pedido ? (
                  <Link href={`/pedidos?pedido=${solicitud.pedido.idPedido}`}>
                    {solicitud.pedido.numeroPedido ?? `#${solicitud.pedido.idPedido}`}
                  </Link>
                ) : (
                  "-"
                )
            },
            {
              header: "Contacto",
              cell: (solicitud) => solicitud.telefono || solicitud.email || "-"
            },
            {
              header: "Acciones",
              cell: (solicitud) => (
                <div className="acciones-tabla">
                  <button
                    className="boton-secundario"
                    onClick={() => modalSolicitud.abrir({ modo: "editar", solicitud })}
                    type="button"
                  >
                    Editar
                  </button>
                  {solicitud.idPedido ? null : (
                    <button
                      className="boton-secundario"
                      onClick={() => {
                        setEstadoTemporal(solicitud.estadoSolicitud);
                        modalSolicitud.abrir({ modo: "estado", solicitud });
                      }}
                      type="button"
                    >
                      Estado
                    </button>
                  )}
                  {!solicitud.idPedido && solicitud.idCliente && ESTADOS_CONVERTIBLES.includes(solicitud.estadoSolicitud) ? (
                    <button
                      className="boton-secundario"
                      onClick={() => {
                        setErrorConversion(null);
                        setConvertido(null);
                        modalSolicitud.abrir({ modo: "convertir", solicitud });
                      }}
                      type="button"
                    >
                      Convertir en pedido
                    </button>
                  ) : null}
                </div>
              )
            }
          ]}
          data={solicitudes}
          keyExtractor={(solicitud) => solicitud.idSolicitudEspecial}
        />
      ) : null}

      {convertido ? (
        <MensajeExito
          mensaje={
            <>
              Se creo el pedido {convertido.numeroPedido ?? `#${convertido.idPedido}`}.{" "}
              <Link href={`/pedidos?pedido=${convertido.idPedido}`}>Ir al pedido</Link> para cargarle los items y precios.
            </>
          }
        />
      ) : null}

      {!cargando ? (
        <PieListado
          cantidad={solicitudes.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
        />
      ) : null}

      <Modal
        abierto={
          modalSolicitud.abierto &&
          modalSolicitud.contexto !== null &&
          modalSolicitud.contexto.modo !== "estado"
        }
        descripcion="Carga los datos de la solicitud especial."
        onClose={modalSolicitud.cerrar}
        titulo={
          modalSolicitud.contexto?.modo === "editar"
            ? "Editar solicitud especial"
            : "Nueva solicitud especial"
        }
      >
        <FormularioSolicitudEspecial
          onCancel={modalSolicitud.cerrar}
          onSubmit={guardarSolicitud}
          solicitud={
            modalSolicitud.contexto && modalSolicitud.contexto.modo === "editar"
              ? modalSolicitud.contexto.solicitud
              : null
          }
        />
      </Modal>

      <Modal
        abierto={modalSolicitud.abierto && modalSolicitud.contexto?.modo === "convertir"}
        descripcion="Se crea un pedido pendiente para el cliente de la solicitud. Despues le cargas los items y precios."
        onClose={modalSolicitud.cerrar}
        titulo="Convertir en pedido"
      >
        {modalSolicitud.contexto?.modo === "convertir" ? (
          <div className="formulario-modulo">
            {errorConversion ? <MensajeError mensaje={errorConversion} /> : null}
            <p className="texto-secundario">
              Cliente:{" "}
              <strong>
                {`${modalSolicitud.contexto.solicitud.cliente?.nombre ?? ""} ${modalSolicitud.contexto.solicitud.cliente?.apellido ?? ""}`.trim()}
              </strong>
              . La descripcion pasa a las observaciones del pedido y la solicitud queda como convertida.
            </p>
            <div className="acciones-formulario">
              <button className="boton-secundario" onClick={modalSolicitud.cerrar} type="button">
                Volver
              </button>
              <button className="boton-primario" disabled={convirtiendo} onClick={() => void convertir()} type="button">
                {convirtiendo ? "Creando..." : "Crear pedido"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        abierto={
          modalSolicitud.abierto &&
          modalSolicitud.contexto !== null &&
          modalSolicitud.contexto.modo === "estado"
        }
        descripcion="Actualiza solamente el estado operativo de la solicitud."
        onClose={modalSolicitud.cerrar}
        titulo="Cambiar estado"
      >
        <div className="formulario-modulo">
          <label className="campo-formulario" htmlFor="estado-solicitud">
            <span>Estado</span>
            <select
              id="estado-solicitud"
              onChange={(event) => setEstadoTemporal(event.target.value as EstadoSolicitud)}
              value={estadoTemporal}
            >
              {/* "Convertida a pedido" solo con el boton "Convertir en pedido". */}
              {ESTADOS_SOLICITUD.filter((estado) => estado !== "CONVERTIDA_A_PEDIDO").map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </label>

          <div className="acciones-formulario">
            <button className="boton-secundario" onClick={modalSolicitud.cerrar} type="button">
              Cancelar
            </button>
            <button className="boton-primario" onClick={() => void guardarEstado()} type="button">
              Guardar estado
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
