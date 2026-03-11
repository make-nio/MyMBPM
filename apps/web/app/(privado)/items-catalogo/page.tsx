"use client";

import { useEffect, useState } from "react";

import { FormularioComponenteItem } from "../../../src/components/modulos/items-catalogo/formulario-componente-item";
import { FormularioItemCatalogo } from "../../../src/components/modulos/items-catalogo/formulario-item-catalogo";
import { TablaComponentesItem } from "../../../src/components/modulos/items-catalogo/tabla-componentes-item";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { Modal } from "../../../src/components/ui/modal";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useModal } from "../../../src/hooks/use-modal";
import { listarCategorias } from "../../../src/lib/modulos/categorias";
import {
  actualizarComponenteItem,
  actualizarItemCatalogo,
  cambiarEstadoItemCatalogo,
  crearComponenteItem,
  crearItemCatalogo,
  eliminarComponenteItem,
  listarComponentesItem,
  listarItemsCatalogo
} from "../../../src/lib/modulos/items-catalogo";
import { Categoria } from "../../../src/types/categorias";
import {
  ItemCatalogo,
  ItemCatalogoComponente,
  TIPOS_ITEM,
  TipoItem
} from "../../../src/types/items-catalogo";

type FiltroTriestado = "todos" | "si" | "no";

export default function ItemsCatalogoPage() {
  const modalItem = useModal<ItemCatalogo>();
  const modalComponente = useModal<ItemCatalogoComponente>();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [items, setItems] = useState<ItemCatalogo[]>([]);
  const [componentes, setComponentes] = useState<ItemCatalogoComponente[]>([]);
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [activoFiltro, setActivoFiltro] = useState<FiltroTriestado>("todos");
  const [publicoFiltro, setPublicoFiltro] = useState<FiltroTriestado>("todos");

  useEffect(() => {
    void listarCategorias({ limit: 100 }).then(setCategorias).catch(() => undefined);
  }, []);

  useEffect(() => {
    async function cargarItems() {
      setCargando(true);
      setError(null);

      try {
        const data = await listarItemsCatalogo({
          tipoItem: tipoFiltro === "todos" ? undefined : (tipoFiltro as TipoItem),
          idCategoria: categoriaFiltro === "todas" ? undefined : categoriaFiltro,
          activo:
            activoFiltro === "todos"
              ? undefined
              : activoFiltro === "si"
                ? true
                : false,
          publico:
            publicoFiltro === "todos"
              ? undefined
              : publicoFiltro === "si"
                ? true
                : false
        });

        setItems(data);

        if (itemSeleccionado) {
          const itemActualizado = data.find(
            (item) => item.idItemCatalogo === itemSeleccionado.idItemCatalogo
          );
          setItemSeleccionado(itemActualizado ?? null);
        }
      } catch (currentError) {
        setError(
          currentError instanceof Error
            ? currentError.message
            : "No fue posible cargar los items del catalogo"
        );
      } finally {
        setCargando(false);
      }
    }

    void cargarItems();
  }, [tipoFiltro, categoriaFiltro, activoFiltro, publicoFiltro]);

  useEffect(() => {
    async function cargarComponentes() {
      if (!itemSeleccionado) {
        setComponentes([]);
        return;
      }

      try {
        const data = await listarComponentesItem(itemSeleccionado.idItemCatalogo);
        setComponentes(data);
      } catch {
        setComponentes([]);
      }
    }

    void cargarComponentes();
  }, [itemSeleccionado]);

  async function recargarItems() {
    const data = await listarItemsCatalogo({
      tipoItem: tipoFiltro === "todos" ? undefined : (tipoFiltro as TipoItem),
      idCategoria: categoriaFiltro === "todas" ? undefined : categoriaFiltro,
      activo:
        activoFiltro === "todos"
          ? undefined
          : activoFiltro === "si"
            ? true
            : false,
      publico:
        publicoFiltro === "todos"
          ? undefined
          : publicoFiltro === "si"
            ? true
            : false
    });

    setItems(data);

    if (itemSeleccionado) {
      const itemActualizado = data.find(
        (item) => item.idItemCatalogo === itemSeleccionado.idItemCatalogo
      );
      setItemSeleccionado(itemActualizado ?? null);
    }
  }

  async function recargarComponentes() {
    if (!itemSeleccionado) {
      return;
    }

    const data = await listarComponentesItem(itemSeleccionado.idItemCatalogo);
    setComponentes(data);
  }

  async function guardarItem(payload: Parameters<typeof crearItemCatalogo>[0]) {
    if (modalItem.contexto) {
      await actualizarItemCatalogo(modalItem.contexto.idItemCatalogo, payload);
    } else {
      await crearItemCatalogo(payload);
    }

    modalItem.cerrar();
    await recargarItems();
  }

  async function toggleEstado(item: ItemCatalogo) {
    await cambiarEstadoItemCatalogo(item.idItemCatalogo, !item.activo);
    await recargarItems();
  }

  async function guardarComponente(payload: Parameters<typeof crearComponenteItem>[1]) {
    if (!itemSeleccionado) {
      return;
    }

    if (modalComponente.contexto) {
      await actualizarComponenteItem(
        itemSeleccionado.idItemCatalogo,
        modalComponente.contexto.idItemCatalogoComponente,
        payload
      );
    } else {
      await crearComponenteItem(itemSeleccionado.idItemCatalogo, payload);
    }

    modalComponente.cerrar();
    await recargarComponentes();
  }

  async function borrarComponente(componente: ItemCatalogoComponente) {
    if (!itemSeleccionado) {
      return;
    }

    const confirmar = window.confirm("Se va a eliminar el componente seleccionado. Continuar?");

    if (!confirmar) {
      return;
    }

    await eliminarComponenteItem(
      itemSeleccionado.idItemCatalogo,
      componente.idItemCatalogoComponente
    );
    await recargarComponentes();
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        botonLabel="Nuevo item"
        descripcion="Gestiona los productos e insumos del catalogo y su receta de componentes."
        filtros={
          <div className="filtros-inline">
            <select
              className="control-filtro"
              onChange={(event) => setTipoFiltro(event.target.value)}
              value={tipoFiltro}
            >
              <option value="todos">Todos los tipos</option>
              {TIPOS_ITEM.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            <select
              className="control-filtro"
              onChange={(event) => setCategoriaFiltro(event.target.value)}
              value={categoriaFiltro}
            >
              <option value="todas">Todas las categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria.idCategoria} value={categoria.idCategoria}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
            <select
              className="control-filtro"
              onChange={(event) => setActivoFiltro(event.target.value as FiltroTriestado)}
              value={activoFiltro}
            >
              <option value="todos">Todos</option>
              <option value="si">Activos</option>
              <option value="no">Inactivos</option>
            </select>
            <select
              className="control-filtro"
              onChange={(event) => setPublicoFiltro(event.target.value as FiltroTriestado)}
              value={publicoFiltro}
            >
              <option value="todos">Publicos + privados</option>
              <option value="si">Publicos</option>
              <option value="no">No publicos</option>
            </select>
          </div>
        }
        onCrear={() => modalItem.abrir(null)}
        titulo="Items catalogo"
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando items del catalogo" /> : null}
      {!cargando && !error && items.length === 0 ? (
        <EstadoVacio
          descripcion="No hay items cargados o el filtro actual no encontro resultados."
          titulo="No encontramos items"
        />
      ) : null}

      {!cargando && !error && items.length > 0 ? (
        <TablaDatos
          columns={[
            { header: "Nombre", cell: (item) => item.nombre },
            { header: "Tipo", cell: (item) => item.tipoItem },
            { header: "Categoria", cell: (item) => item.categoria?.nombre ?? "-" },
            { header: "Publico", cell: (item) => (item.publico ? "Si" : "No") },
            { header: "Estado", cell: (item) => (item.activo ? "Activo" : "Inactivo") },
            {
              header: "Acciones",
              cell: (item) => (
                <div className="acciones-tabla">
                  <button className="boton-secundario" onClick={() => modalItem.abrir(item)} type="button">
                    Editar
                  </button>
                  <button className="boton-secundario" onClick={() => void toggleEstado(item)} type="button">
                    {item.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button className="boton-secundario" onClick={() => setItemSeleccionado(item)} type="button">
                    Receta
                  </button>
                </div>
              )
            }
          ]}
          data={items}
          keyExtractor={(item) => item.idItemCatalogo}
        />
      ) : null}

      <div className="seccion-receta">
        <div className="seccion-receta__columna">
          <div className="tarjeta-seccion">
            <p className="marca-pequena">Datos del item</p>
            {itemSeleccionado ? (
              <>
                <h3>{itemSeleccionado.nombre}</h3>
                <p className="texto-secundario texto-secundario--compacto">
                  Tipo: {itemSeleccionado.tipoItem} · Categoria:{" "}
                  {itemSeleccionado.categoria?.nombre ?? "-"}
                </p>
                <p className="texto-secundario texto-secundario--compacto">
                  Codigo: {itemSeleccionado.codigo || "-"} · Publico:{" "}
                  {itemSeleccionado.publico ? "Si" : "No"}
                </p>
                <p className="texto-secundario texto-secundario--compacto">
                  Imagen principal: {itemSeleccionado.imagenPrincipal || "Sin imagen"}
                </p>
              </>
            ) : (
              <EstadoVacio
                descripcion="Selecciona un item desde la tabla para administrar su receta."
                titulo="No hay item seleccionado"
              />
            )}
          </div>
        </div>

        <div className="seccion-receta__columna seccion-receta__columna--doble">
          <div className="tarjeta-seccion">
            <div className="tarjeta-seccion__encabezado">
              <div>
                <p className="marca-pequena">Componentes / receta</p>
                <h3>{itemSeleccionado ? `Receta de ${itemSeleccionado.nombre}` : "Receta del item"}</h3>
              </div>
              <button
                className="boton-primario"
                disabled={!itemSeleccionado}
                onClick={() => modalComponente.abrir(null)}
                type="button"
              >
                Nuevo componente
              </button>
            </div>

            {!itemSeleccionado ? (
              <EstadoVacio
                descripcion="Primero selecciona un item del listado superior."
                titulo="Selecciona un item para ver su receta"
              />
            ) : componentes.length === 0 ? (
              <EstadoVacio
                descripcion="Este item todavia no tiene componentes configurados."
                titulo="Receta vacia"
              />
            ) : (
              <TablaComponentesItem
                componentes={componentes}
                onEditar={(componente) => modalComponente.abrir(componente)}
                onEliminar={(componente) => void borrarComponente(componente)}
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        abierto={modalItem.abierto}
        descripcion="Carga los datos generales del item de catalogo."
        onClose={modalItem.cerrar}
        titulo={modalItem.contexto ? "Editar item" : "Nuevo item"}
      >
        <FormularioItemCatalogo
          categorias={categorias}
          item={modalItem.contexto}
          onCancel={modalItem.cerrar}
          onSubmit={guardarItem}
        />
      </Modal>

      <Modal
        abierto={modalComponente.abierto}
        descripcion="Define la composicion del item seleccionado."
        onClose={modalComponente.cerrar}
        titulo={modalComponente.contexto ? "Editar componente" : "Nuevo componente"}
      >
        {itemSeleccionado ? (
          <FormularioComponenteItem
            componente={modalComponente.contexto}
            itemPadreId={itemSeleccionado.idItemCatalogo}
            itemsDisponibles={items}
            onCancel={modalComponente.cerrar}
            onSubmit={guardarComponente}
          />
        ) : null}
      </Modal>
    </section>
  );
}
