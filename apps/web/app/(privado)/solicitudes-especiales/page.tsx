"use client";

import { useEffect, useState } from "react";

import { FormularioSolicitudEspecial } from "../../../src/components/modulos/solicitudes-especiales/formulario-solicitud-especial";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useModal } from "../../../src/hooks/use-modal";
import { listarClientes } from "../../../src/lib/modulos/clientes";
import {
  actualizarSolicitudEspecial,
  cambiarEstadoSolicitudEspecial,
  crearSolicitudEspecial,
  listarSolicitudesEspeciales
} from "../../../src/lib/modulos/solicitudes-especiales";
import { Cliente } from "../../../src/types/clientes";
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
  const [solicitudes, setSolicitudes] = useState<SolicitudEspecial[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoTemporal, setEstadoTemporal] = useState<EstadoSolicitud>("PENDIENTE");

  useEffect(() => {
    void listarClientes({ limit: 100 }).then(setClientes).catch(() => undefined);
  }, []);

  useEffect(() => {
    async function cargarSolicitudes() {
      setCargando(true);
      setError(null);

      try {
        const data = await listarSolicitudesEspeciales({
          estadoSolicitud:
            estadoFiltro === "todos" ? undefined : (estadoFiltro as EstadoSolicitud)
        });
        setSolicitudes(data);
      } catch (currentError) {
        setError(
          currentError instanceof Error
            ? currentError.message
            : "No fue posible cargar las solicitudes"
        );
      } finally {
        setCargando(false);
      }
    }

    void cargarSolicitudes();
  }, [estadoFiltro]);

  async function recargar() {
    const data = await listarSolicitudesEspeciales({
      estadoSolicitud:
        estadoFiltro === "todos" ? undefined : (estadoFiltro as EstadoSolicitud)
    });
    setSolicitudes(data);
  }

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
          clientes={clientes}
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
