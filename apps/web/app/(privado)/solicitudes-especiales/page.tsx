"use client";

import { useState } from "react";

import { FormularioSolicitudEspecial } from "../../../src/components/modulos/solicitudes-especiales/formulario-solicitud-especial";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { PieListado } from "../../../src/components/ui/pie-listado";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useListadoPaginado } from "../../../src/hooks/use-listado-paginado";
import { useModal } from "../../../src/hooks/use-modal";
import {
  actualizarSolicitudEspecial,
  cambiarEstadoSolicitudEspecial,
  crearSolicitudEspecial,
  listarSolicitudesEspeciales
} from "../../../src/lib/modulos/solicitudes-especiales";
import {
  ESTADOS_SOLICITUD,
  EstadoSolicitud,
  SolicitudEspecial
} from "../../../src/types/solicitudes-especiales";

type ContextoSolicitudModal =
  | { modo: "crear"; solicitud: null }
  | { modo: "editar"; solicitud: SolicitudEspecial }
  | { modo: "estado"; solicitud: SolicitudEspecial };

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
        botonLabel="Nueva solicitud"
        descripcion="Gestiona requerimientos especiales y su seguimiento interno."
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
        titulo="Solicitudes especiales"
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
                </div>
              )
            }
          ]}
          data={solicitudes}
          keyExtractor={(solicitud) => solicitud.idSolicitudEspecial}
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
              {ESTADOS_SOLICITUD.map((estado) => (
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
