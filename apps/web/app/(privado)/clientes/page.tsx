"use client";

import { useEffect, useState } from "react";

import { FormularioCliente } from "../../../src/components/modulos/clientes/formulario-cliente";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useModal } from "../../../src/hooks/use-modal";
import {
  actualizarCliente,
  cambiarEstadoCliente,
  crearCliente,
  listarClientes
} from "../../../src/lib/modulos/clientes";
import { Cliente } from "../../../src/types/clientes";

type FiltroActivo = "todos" | "activos" | "inactivos";

export default function ClientesPage() {
  const modalCliente = useModal<Cliente>();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("todos");

  useEffect(() => {
    async function cargarClientes() {
      setCargando(true);
      setError(null);

      try {
        const data = await listarClientes({
          busqueda: busquedaAplicada || undefined,
          activo:
            filtroActivo === "todos"
              ? undefined
              : filtroActivo === "activos"
                ? true
                : false
        });

        setClientes(data);
      } catch (currentError) {
        setError(
          currentError instanceof Error
            ? currentError.message
            : "No fue posible cargar los clientes"
        );
      } finally {
        setCargando(false);
      }
    }

    void cargarClientes();
  }, [busquedaAplicada, filtroActivo]);

  async function recargar() {
    const data = await listarClientes({
      busqueda: busquedaAplicada || undefined,
      activo:
        filtroActivo === "todos"
          ? undefined
          : filtroActivo === "activos"
            ? true
            : false
    });
    setClientes(data);
  }

  async function guardarCliente(payload: Parameters<typeof crearCliente>[0]) {
    if (modalCliente.contexto) {
      await actualizarCliente(modalCliente.contexto.idCliente, payload);
    } else {
      await crearCliente(payload);
    }

    modalCliente.cerrar();
    await recargar();
  }

  async function toggleEstado(cliente: Cliente) {
    await cambiarEstadoCliente(cliente.idCliente, !cliente.activo);
    await recargar();
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        botonLabel="Nuevo cliente"
        descripcion="Gestiona la cartera de clientes y sus datos principales."
        filtros={
          <div className="filtros-inline">
            <input
              className="control-filtro"
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre, telefono, email o documento"
              value={busqueda}
            />
            <select
              className="control-filtro"
              onChange={(event) => setFiltroActivo(event.target.value as FiltroActivo)}
              value={filtroActivo}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
            <button className="boton-secundario" onClick={() => setBusquedaAplicada(busqueda)} type="button">
              Buscar
            </button>
          </div>
        }
        onCrear={() => modalCliente.abrir(null)}
        titulo="Clientes"
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando clientes" /> : null}
      {!cargando && !error && clientes.length === 0 ? (
        <EstadoVacio
          descripcion="No hay clientes cargados o la busqueda actual no encontro resultados."
          titulo="No encontramos clientes"
        />
      ) : null}

      {!cargando && !error && clientes.length > 0 ? (
        <TablaDatos
          columns={[
            {
              header: "Cliente",
              cell: (cliente) => `${cliente.nombre} ${cliente.apellido ?? ""}`.trim()
            },
            {
              header: "Contacto",
              cell: (cliente) => cliente.telefono || cliente.email || "Sin contacto"
            },
            {
              header: "Localidad",
              cell: (cliente) => cliente.localidad || "-"
            },
            {
              header: "Estado",
              cell: (cliente) => (cliente.activo ? "Activo" : "Inactivo")
            },
            {
              header: "Acciones",
              cell: (cliente) => (
                <div className="acciones-tabla">
                  <button
                    className="boton-secundario"
                    onClick={() => modalCliente.abrir(cliente)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="boton-secundario"
                    onClick={() => void toggleEstado(cliente)}
                    type="button"
                  >
                    {cliente.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              )
            }
          ]}
          data={clientes}
          keyExtractor={(cliente) => cliente.idCliente}
        />
      ) : null}

      <Modal
        abierto={modalCliente.abierto}
        descripcion="Completa los datos principales del cliente."
        onClose={modalCliente.cerrar}
        titulo={modalCliente.contexto ? "Editar cliente" : "Nuevo cliente"}
      >
        <FormularioCliente
          cliente={modalCliente.contexto}
          onCancel={modalCliente.cerrar}
          onSubmit={guardarCliente}
        />
      </Modal>
    </section>
  );
}
