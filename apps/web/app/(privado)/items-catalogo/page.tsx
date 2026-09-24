"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { useUsuarioAutenticado } from "../../../src/components/auth/contexto-sesion";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { MensajeExito } from "../../../src/components/ui/mensaje-exito";
import { Modal } from "../../../src/components/ui/modal";
import { PieListado } from "../../../src/components/ui/pie-listado";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useDesplazarAlDetalle } from "../../../src/hooks/use-desplazar-al-detalle";
import { useAbrirDesdeUrl } from "../../../src/hooks/use-abrir-desde-url";
import { useListadoPaginado } from "../../../src/hooks/use-listado-paginado";
import { useModal } from "../../../src/hooks/use-modal";
import { usePrecargar } from "../../../src/hooks/use-precargar";
import { calcularCostoReceta } from "../../../src/lib/costos";
import { formatearMoneda } from "../../../src/lib/formato";
import { listarCategorias } from "../../../src/lib/modulos/categorias";
import {
  actualizarComponenteItem,
  actualizarItemCatalogo,
  cambiarEstadoItemCatalogo,
  crearComponenteItem,
  crearItemCatalogo,
  eliminarComponenteItem,
  listarComponentesItem,
  listarItemsCatalogo,
  obtenerItemCatalogo
} from "../../../src/lib/modulos/items-catalogo";
import { Categoria } from "../../../src/types/categorias";
import {
  ItemCatalogo,
  ItemCatalogoComponente,
  TIPOS_ITEM,
  TipoItem
} from "../../../src/types/items-catalogo";

// Paneles, historiales e importacion se ven solo al elegir un registro o abrir su modal: su
// codigo no entra en el JS inicial de la pantalla, que primero tiene que mostrar la lista.
const HistorialPrecios = dynamic(() => import("../../../src/components/modulos/auditoria/historial-precios").then((modulo) => modulo.HistorialPrecios), {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando historial de precios" />
});
const HistorialCambios = dynamic(() => import("../../../src/components/modulos/auditoria/historial-cambios").then((modulo) => modulo.HistorialCambios), {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando historial" />
});
const TablaComponentesItem = dynamic(() => import("../../../src/components/modulos/items-catalogo/tabla-componentes-item").then((modulo) => modulo.TablaComponentesItem), {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando receta" />
});
const ImportarCatalogo = dynamic(() => import("../../../src/components/modulos/items-catalogo/importar-catalogo").then((modulo) => modulo.ImportarCatalogo), {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando importacion" />
});

// Los formularios se ven solo al abrir su modal: no entran en el JS inicial de la pantalla y se
// precargan cuando el navegador queda libre (usePrecargar), asi el modal abre sin esperar.
const cargarFormularioItemCatalogo = () => import("../../../src/components/modulos/items-catalogo/formulario-item-catalogo").then((modulo) => modulo.FormularioItemCatalogo);
const cargarFormularioComponenteItem = () => import("../../../src/components/modulos/items-catalogo/formulario-componente-item").then((modulo) => modulo.FormularioComponenteItem);
const FormularioItemCatalogo = dynamic(cargarFormularioItemCatalogo, {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando formulario" />
});
const FormularioComponenteItem = dynamic(cargarFormularioComponenteItem, {
  ssr: false,
  loading: () => <EstadoCargando descripcion="Un momento." titulo="Cargando formulario" />
});

type FiltroTriestado = "todos" | "si" | "no";

// Cuanto cuesta fabricar una unidad segun la receta, frente al costo cargado en el item.
function CostoReceta({
  componentes,
  costoCargado,
  onUsarComoCosto
}: {
  componentes: ItemCatalogoComponente[];
  costoCargado: string | null;
  onUsarComoCosto: (costo: number) => void;
}) {
  const { costo, sinCosto } = calcularCostoReceta(componentes);
  const distinto = costo > 0 && Number(costoCargado ?? 0) !== costo;

  return (
    <div aria-label="Costo por receta" className="costo-receta" role="region">
      <p>
        Costo por receta: <strong data-testid="costo-receta">{formatearMoneda(costo)}</strong> · Costo cargado:{" "}
        <strong>{costoCargado === null ? "sin cargar" : formatearMoneda(costoCargado)}</strong>
      </p>
      {sinCosto.length > 0 ? (
        <p className="texto-secundario texto-secundario--compacto">Sin costo cargado: {sinCosto.join(", ")}.</p>
      ) : null}
      {distinto ? (
        <button className="boton-secundario" onClick={() => onUsarComoCosto(costo)} type="button">
          Usar como costo
        </button>
      ) : null}
    </div>
  );
}

export default function ItemsCatalogoPage() {
  usePrecargar(cargarFormularioItemCatalogo, cargarFormularioComponenteItem);
  const { esAdministrador } = useUsuarioAutenticado();
  const modalItem = useModal<ItemCatalogo>();
  const modalComponente = useModal<ItemCatalogoComponente>();
  const modalImportacion = useModal();
  const [avisoImportacion, setAvisoImportacion] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [componentes, setComponentes] = useState<ItemCatalogoComponente[]>([]);
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemCatalogo | null>(null);
  const refReceta = useDesplazarAlDetalle(itemSeleccionado?.idItemCatalogo ?? null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [activoFiltro, setActivoFiltro] = useState<FiltroTriestado>("todos");
  const [publicoFiltro, setPublicoFiltro] = useState<FiltroTriestado>("todos");

  useEffect(() => {
    void listarCategorias({ limit: 100 }).then(setCategorias).catch(() => undefined);
  }, []);

  const listado = useListadoPaginado<ItemCatalogo>(
    (limit, offset) => listarItemsCatalogo({
          busqueda: busquedaAplicada || undefined,
          tipoItem: tipoFiltro === "todos" ? undefined : (tipoFiltro as TipoItem),
          idCategoria: categoriaFiltro === "todas" ? undefined : categoriaFiltro,
          activo: activoFiltro === "todos" ? undefined : activoFiltro === "si",
          publico: publicoFiltro === "todos" ? undefined : publicoFiltro === "si",
          limit,
          offset
        }),
    [busquedaAplicada, tipoFiltro, categoriaFiltro, activoFiltro, publicoFiltro],
    "No fue posible cargar los items del catalogo"
  );
  const { items, cargando, error } = listado;

  // /items-catalogo?item=ID (desde la busqueda global): lista filtrada por su nombre y su ficha abierta.
  useAbrirDesdeUrl("item", obtenerItemCatalogo, (item) => {
    setBusqueda(item.nombre);
    setBusquedaAplicada(item.nombre);
    modalItem.abrir(item);
  });

  // Si el item de la receta cambio (o ya no esta en el listado), el panel lo refleja.
  useEffect(() => {
    setItemSeleccionado((actual) =>
      actual ? (items.find((item) => item.idItemCatalogo === actual.idItemCatalogo) ?? null) : null
    );
  }, [items]);

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
    await listado.recargar();
  }

  // Copia el costo calculado por receta al costo del item (queda en el historial de cambios).
  async function usarComoCosto(item: ItemCatalogo, costo: number) {
    await actualizarItemCatalogo(item.idItemCatalogo, { costo });
    await recargarItems();
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
          <form
            className="filtros-inline"
            onSubmit={(event) => {
              event.preventDefault();
              setBusquedaAplicada(busqueda.trim());
            }}
          >
            <input
              aria-label="Buscar item"
              className="control-filtro"
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o codigo"
              type="search"
              value={busqueda}
            />
            <select
              aria-label="Filtrar por tipo"
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
              aria-label="Filtrar por categoria"
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
              aria-label="Filtrar por estado"
              className="control-filtro"
              onChange={(event) => setActivoFiltro(event.target.value as FiltroTriestado)}
              value={activoFiltro}
            >
              <option value="todos">Todos</option>
              <option value="si">Activos</option>
              <option value="no">Inactivos</option>
            </select>
            <select
              aria-label="Filtrar por visibilidad"
              className="control-filtro"
              onChange={(event) => setPublicoFiltro(event.target.value as FiltroTriestado)}
              value={publicoFiltro}
            >
              <option value="todos">Publicos + privados</option>
              <option value="si">Publicos</option>
              <option value="no">No publicos</option>
            </select>
            <button className="boton-secundario" type="submit">
              Buscar
            </button>
          </form>
        }
        onCrear={() => modalItem.abrir(null)}
        titulo="Items catalogo"
      />

      {esAdministrador ? (
        <div className="acciones-tabla">
          <button
            className="boton-secundario"
            onClick={() => {
              setAvisoImportacion(null);
              modalImportacion.abrir(null);
            }}
            type="button"
          >
            Importar CSV
          </button>
        </div>
      ) : null}
      {avisoImportacion ? <MensajeExito mensaje={avisoImportacion} /> : null}

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

      {!cargando ? (
        <PieListado
          cantidad={items.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
        />
      ) : null}

      <div className="seccion-receta" ref={refReceta}>
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
                {esAdministrador ? (
                  <>
                    <HistorialPrecios
                      idItemCatalogo={itemSeleccionado.idItemCatalogo}
                      version={itemSeleccionado.fechaModificacion}
                    />
                    <HistorialCambios
                      entidad="ITEM_CATALOGO"
                      idEntidad={itemSeleccionado.idItemCatalogo}
                      version={itemSeleccionado.fechaModificacion}
                    />
                  </>
                ) : null}
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
              <>
                <TablaComponentesItem
                  componentes={componentes}
                  onEditar={(componente) => modalComponente.abrir(componente)}
                  onEliminar={(componente) => void borrarComponente(componente)}
                />
                {itemSeleccionado && esAdministrador ? (
                  <CostoReceta
                    componentes={componentes}
                    costoCargado={itemSeleccionado.costo ?? null}
                    onUsarComoCosto={(costo) => void usarComoCosto(itemSeleccionado, costo)}
                  />
                ) : null}
              </>
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
        abierto={modalImportacion.abierto}
        descripcion="Carga muchos items de una vez desde un archivo CSV (Excel o Google Sheets)."
        onClose={modalImportacion.cerrar}
        titulo="Importar catalogo"
      >
        <ImportarCatalogo
          onCancel={modalImportacion.cerrar}
          onImportado={async (resultado) => {
            modalImportacion.cerrar();
            setAvisoImportacion(
              `Se importaron ${resultado.creados} items` +
                (resultado.categoriasCreadas.length > 0 ? ` y se crearon las categorias ${resultado.categoriasCreadas.join(", ")}.` : ".")
            );
            void listarCategorias({ limit: 100 }).then(setCategorias).catch(() => undefined);
            await recargarItems();
          }}
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
            onCancel={modalComponente.cerrar}
            onSubmit={guardarComponente}
          />
        ) : null}
      </Modal>
    </section>
  );
}
