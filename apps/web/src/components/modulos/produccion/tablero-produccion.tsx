"use client";

import { MensajeError } from "../../ui/mensaje-error";
import { PieListado } from "../../ui/pie-listado";
import { useListadoPaginado } from "../../../hooks/use-listado-paginado";
import { formatearCantidad, formatearFecha } from "../../../lib/formato";
import { listarOrdenesProduccion } from "../../../lib/modulos/produccion";
import { EstadoProduccion, OrdenProduccion } from "../../../types/produccion";
import { AccionOrden } from "./panel-orden";

type ElegirOrden = (idOrdenProduccion: string, accion: AccionOrden | null) => void;

const COLUMNAS: Array<{ estado: EstadoProduccion; titulo: string; vacio: string }> = [
  { estado: "PENDIENTE", titulo: "Pendientes", vacio: "No hay ordenes para iniciar." },
  { estado: "EN_PROCESO", titulo: "En proceso", vacio: "No hay nada en produccion." },
  { estado: "FINALIZADA", titulo: "Finalizadas", vacio: "Todavia no hay ordenes finalizadas." },
  { estado: "CANCELADA", titulo: "Canceladas", vacio: "No hay ordenes canceladas." }
];

// Botones de cada estado: los mismos cambios que ya existen en el detalle de la orden. Todos
// abren el detalle; iniciar, finalizar y cancelar abren ademas su confirmacion con el impacto en
// stock, asi no hay dos caminos distintos para mover stock.
function acciones(orden: OrdenProduccion): Array<{ accion: AccionOrden | null; etiqueta: string; primaria?: boolean }> {
  const tieneProductos = (orden.detalles ?? []).length > 0;

  switch (orden.estadoProduccion) {
    case "PENDIENTE":
      return [
        ...(tieneProductos ? [{ accion: "iniciar" as const, etiqueta: "Iniciar", primaria: true }] : []),
        { accion: null, etiqueta: tieneProductos ? "Ver" : "Agregar productos" },
        { accion: "cancelar", etiqueta: "Cancelar" }
      ];
    case "EN_PROCESO":
      return [
        { accion: "finalizar", etiqueta: "Finalizar", primaria: true },
        { accion: null, etiqueta: "Ver" },
        { accion: "cancelar", etiqueta: "Cancelar" }
      ];
    default:
      return [{ accion: null, etiqueta: "Ver" }];
  }
}

function TarjetaOrden({ orden, onElegir }: { orden: OrdenProduccion; onElegir: ElegirOrden }) {
  const detalles = orden.detalles ?? [];
  const fecha =
    orden.estadoProduccion === "EN_PROCESO" && orden.fechaInicio
      ? `Inicio: ${formatearFecha(orden.fechaInicio)}`
      : orden.fechaFin
        ? `Fin: ${formatearFecha(orden.fechaFin)}`
        : `Alta: ${formatearFecha(orden.fechaAlta)}`;

  return (
    <li className="tablero-produccion__tarjeta">
      <article aria-label={`Orden ${orden.idOrdenProduccion}`}>
        <h3>Orden #{orden.idOrdenProduccion}</h3>
        {detalles.length === 0 ? (
          <p className="texto-secundario texto-secundario--compacto">Sin productos todavia</p>
        ) : (
          <ul className="tablero-produccion__productos">
            {detalles.map((detalle) => (
              <li key={detalle.idOrdenProduccionDetalle}>
                {detalle.itemCatalogoProducto?.nombre ?? `Item ${detalle.idItemCatalogoProducto}`} ×{" "}
                {formatearCantidad(detalle.cantidad)}
              </li>
            ))}
          </ul>
        )}
        <p className="texto-secundario texto-secundario--compacto">{fecha}</p>
        {orden.observaciones ? <p className="texto-secundario texto-secundario--compacto">{orden.observaciones}</p> : null}
        <div className="acciones-tabla">
          {acciones(orden).map(({ accion, etiqueta, primaria }) => (
            <button
              aria-label={`${etiqueta} orden ${orden.idOrdenProduccion}`}
              className={primaria ? "boton-primario" : "boton-secundario"}
              key={etiqueta}
              onClick={() => onElegir(orden.idOrdenProduccion, accion)}
              type="button"
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </article>
    </li>
  );
}

function ColumnaTablero({
  estado,
  titulo,
  vacio,
  version,
  onElegir
}: {
  estado: EstadoProduccion;
  titulo: string;
  vacio: string;
  version: number;
  onElegir: ElegirOrden;
}) {
  const listado = useListadoPaginado<OrdenProduccion>(
    (limit, offset) => listarOrdenesProduccion({ estadoProduccion: estado, limit, offset }),
    [estado, version],
    `No fue posible cargar las ordenes (${titulo.toLowerCase()})`
  );

  return (
    <section aria-label={titulo} className="tablero-produccion__columna">
      <h2>
        {titulo}
        {listado.cargando ? null : <span className="tablero-produccion__cantidad"> ({listado.items.length}{listado.hayMas ? "+" : ""})</span>}
      </h2>
      {listado.error ? <MensajeError mensaje={listado.error} /> : null}
      {listado.cargando ? <p className="texto-secundario">Cargando...</p> : null}
      {!listado.cargando && !listado.error && listado.items.length === 0 ? (
        <p className="texto-secundario">{vacio}</p>
      ) : null}
      {listado.items.length > 0 ? (
        <ul className="tablero-produccion__lista">
          {listado.items.map((orden) => (
            <TarjetaOrden key={orden.idOrdenProduccion} onElegir={onElegir} orden={orden} />
          ))}
        </ul>
      ) : null}
      {!listado.cargando && listado.hayMas ? (
        <PieListado
          cantidad={listado.items.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
        />
      ) : null}
    </section>
  );
}

// Ordenes de produccion en columnas por estado, con botones (sin arrastrar): se usa igual con
// teclado, lector de pantalla y en el celular, donde las columnas quedan una debajo de la otra.
export function TableroProduccion({ version, onElegir }: { version: number; onElegir: ElegirOrden }) {
  return (
    <div className="tablero-produccion">
      {COLUMNAS.map((columna) => (
        <ColumnaTablero key={columna.estado} onElegir={onElegir} version={version} {...columna} />
      ))}
    </div>
  );
}
