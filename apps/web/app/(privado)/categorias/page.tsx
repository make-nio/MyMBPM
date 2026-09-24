"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { PieListado } from "../../../src/components/ui/pie-listado";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useListadoPaginado } from "../../../src/hooks/use-listado-paginado";
import { useModal } from "../../../src/hooks/use-modal";
import { usePrecargar } from "../../../src/hooks/use-precargar";
import {
  actualizarCategoria,
  cambiarEstadoCategoria,
  crearCategoria,
  listarCategorias
} from "../../../src/lib/modulos/categorias";
import { Categoria } from "../../../src/types/categorias";

// Los formularios se ven solo al abrir su modal: no entran en el JS inicial de la pantalla y se
// precargan cuando el navegador queda libre (usePrecargar), asi el modal abre sin esperar.
const cargarFormularioCategoria = () => import("../../../src/components/modulos/categorias/formulario-categoria").then((modulo) => modulo.FormularioCategoria);
const FormularioCategoria = dynamic(cargarFormularioCategoria, {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando formulario" />
});

type FiltroActivo = "todos" | "activos" | "inactivos";

export default function CategoriasPage() {
  usePrecargar(cargarFormularioCategoria);
  const modalCategoria = useModal<Categoria>();
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("todos");

  const listado = useListadoPaginado<Categoria>(
    (limit, offset) =>
      listarCategorias({
        activo: filtroActivo === "todos" ? undefined : filtroActivo === "activos",
        limit,
        offset
      }),
    [filtroActivo],
    "No fue posible cargar las categorias"
  );
  const { items: categorias, cargando, error, recargar } = listado;

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
            aria-label="Filtrar por estado"
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

      {!cargando ? (
        <PieListado
          cantidad={categorias.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
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
