"use client";

import { useEffect, useState } from "react";

import { FormularioCategoria } from "../../../src/components/modulos/categorias/formulario-categoria";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useModal } from "../../../src/hooks/use-modal";
import {
  actualizarCategoria,
  cambiarEstadoCategoria,
  crearCategoria,
  listarCategorias
} from "../../../src/lib/modulos/categorias";
import { Categoria } from "../../../src/types/categorias";

type FiltroActivo = "todos" | "activos" | "inactivos";

export default function CategoriasPage() {
  const modalCategoria = useModal<Categoria>();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("todos");

  useEffect(() => {
    async function cargarCategorias() {
      setCargando(true);
      setError(null);

      try {
        const data = await listarCategorias({
          activo:
            filtroActivo === "todos"
              ? undefined
              : filtroActivo === "activos"
                ? true
                : false
        });

        setCategorias(data);
      } catch (currentError) {
        setError(
          currentError instanceof Error
            ? currentError.message
            : "No fue posible cargar las categorias"
        );
      } finally {
        setCargando(false);
      }
    }

    void cargarCategorias();
  }, [filtroActivo]);

  async function recargar() {
    const data = await listarCategorias({
      activo:
        filtroActivo === "todos"
          ? undefined
          : filtroActivo === "activos"
            ? true
            : false
    });
    setCategorias(data);
  }

  async function guardarCategoria(payload: {
    nombre: string;
    slug: string;
    descripcion?: string;
    activo?: boolean;
  }) {
    if (modalCategoria.contexto) {
      await actualizarCategoria(modalCategoria.contexto.idCategoria, payload);
    } else {
      await crearCategoria(payload);
    }

    modalCategoria.cerrar();
    await recargar();
  }

  async function toggleEstado(categoria: Categoria) {
    await cambiarEstadoCategoria(categoria.idCategoria, !categoria.activo);
    await recargar();
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        botonLabel="Nueva categoria"
        descripcion="Gestiona altas, ediciones y activacion de categorias del catalogo."
        filtros={
          <select
            className="control-filtro"
            onChange={(event) => setFiltroActivo(event.target.value as FiltroActivo)}
            value={filtroActivo}
          >
            <option value="todos">Todas</option>
            <option value="activos">Activas</option>
            <option value="inactivos">Inactivas</option>
          </select>
        }
        onCrear={() => modalCategoria.abrir(null)}
        titulo="Categorias"
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando categorias" /> : null}
      {!cargando && !error && categorias.length === 0 ? (
        <EstadoVacio
          descripcion="Todavia no hay categorias cargadas o el filtro no encontro resultados."
          titulo="No encontramos categorias"
        />
      ) : null}

      {!cargando && !error && categorias.length > 0 ? (
        <TablaDatos
          columns={[
            { header: "Nombre", cell: (categoria) => categoria.nombre },
            { header: "Slug", cell: (categoria) => categoria.slug },
            {
              header: "Descripcion",
              cell: (categoria) => categoria.descripcion || "Sin descripcion"
            },
            {
              header: "Estado",
              cell: (categoria) => (categoria.activo ? "Activa" : "Inactiva")
            },
            {
              header: "Acciones",
              cell: (categoria) => (
                <div className="acciones-tabla">
                  <button
                    className="boton-secundario"
                    onClick={() => modalCategoria.abrir(categoria)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="boton-secundario"
                    onClick={() => void toggleEstado(categoria)}
                    type="button"
                  >
                    {categoria.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              )
            }
          ]}
          data={categorias}
          keyExtractor={(categoria) => categoria.idCategoria}
        />
      ) : null}

      <Modal
        abierto={modalCategoria.abierto}
        descripcion="Completa los datos principales de la categoria."
        onClose={modalCategoria.cerrar}
        titulo={modalCategoria.contexto ? "Editar categoria" : "Nueva categoria"}
      >
        <FormularioCategoria
          categoria={modalCategoria.contexto}
          onCancel={modalCategoria.cerrar}
          onSubmit={guardarCategoria}
        />
      </Modal>
    </section>
  );
}
