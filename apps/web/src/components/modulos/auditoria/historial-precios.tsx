"use client";

import { useListadoPaginado } from "../../../hooks/use-listado-paginado";
import { formatearEstado, formatearFecha } from "../../../lib/formato";
import { describirPrecio, listarHistorialPrecios } from "../../../lib/modulos/auditoria";
import { PuntoPrecio } from "../../../types/auditoria";
import { MensajeError } from "../../ui/mensaje-error";
import { PieListado } from "../../ui/pie-listado";

type HistorialPreciosProps = {
  idItemCatalogo: string;
  // Cambia cuando el item se edita, para volver a cargar la linea de tiempo.
  version?: string;
};

// Como fueron cambiando el precio y el costo del item, sacado de la auditoria. Solo para
// administradores (la API tambien lo restringe).
export function HistorialPrecios({ idItemCatalogo, version }: HistorialPreciosProps) {
  const listado = useListadoPaginado<PuntoPrecio>(
    (limit, offset) => listarHistorialPrecios(idItemCatalogo, limit, offset),
    [idItemCatalogo, version],
    "No fue posible cargar el historial de precios"
  );
  const { items: puntos, cargando, error } = listado;

  return (
    <div aria-label="Historial de precio y costo" className="historial-cambios historial-precios" role="region">
      <p className="marca-pequena">Historial de precio y costo</p>
      {error ? <MensajeError mensaje={error} /> : null}
      {cargando ? <p className="texto-secundario">Cargando...</p> : null}
      {!cargando && !error && puntos.length === 0 ? (
        <p className="texto-secundario">Todavia no hay cambios de precio ni de costo registrados.</p>
      ) : null}
      {!cargando && puntos.length > 0 ? (
        <ol className="historial-cambios__lista historial-precios__lista">
          {puntos.map((punto) => (
            <li key={punto.idAuditoriaCambio}>
              <p className="historial-cambios__titulo">
                <time dateTime={punto.fecha}>{formatearFecha(punto.fecha)}</time> ·{" "}
                {punto.usuario ? `${punto.usuario.nombre} ${punto.usuario.apellido}` : "Sin usuario"}
                {punto.accion === "ALTA" ? ` · ${formatearEstado(punto.accion)}` : null}
              </p>
              <dl className="historial-precios__valores">
                {punto.precio ? (
                  <div>
                    <dt>Precio</dt>
                    <dd>{describirPrecio(punto.precio)}</dd>
                  </div>
                ) : null}
                {punto.costo ? (
                  <div>
                    <dt>Costo</dt>
                    <dd>{describirPrecio(punto.costo)}</dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ol>
      ) : null}
      {!cargando && puntos.length > 0 ? (
        <PieListado
          cantidad={puntos.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
        />
      ) : null}
    </div>
  );
}
