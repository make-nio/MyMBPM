"use client";

import { ChangeEvent, useState } from "react";

import { MensajeError } from "../../ui/mensaje-error";
import { TablaDatos } from "../../ui/tabla-datos";
import { descargarCsv, leerCsv } from "../../../lib/csv";
import { COLUMNAS_CATALOGO, mapearFilasCatalogo, plantillaCatalogo } from "../../../lib/importacion/catalogo";
import { importarCatalogo, previsualizarImportacionCatalogo } from "../../../lib/modulos/importacion-catalogo";
import {
  FilaImportacionCatalogo,
  PrevisualizacionCatalogo,
  ResultadoImportacionCatalogo
} from "../../../types/importacion-catalogo";

type ImportarCatalogoProps = {
  onCancel: () => void;
  onImportado: (resultado: ResultadoImportacionCatalogo) => Promise<void> | void;
};

// Importacion del catalogo desde un CSV: se elige el archivo, se ve una vista previa con los
// errores por fila y, si no hay ninguno, se confirma. La API crea todo o nada.
export function ImportarCatalogo({ onCancel, onImportado }: ImportarCatalogoProps) {
  const [filas, setFilas] = useState<FilaImportacionCatalogo[]>([]);
  const [vista, setVista] = useState<PrevisualizacionCatalogo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function elegirArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    setVista(null);
    setFilas([]);
    setError(null);

    if (!archivo) {
      return;
    }

    setProcesando(true);
    try {
      const { filas: leidas, faltantes } = mapearFilasCatalogo(leerCsv(await archivo.text()));

      if (faltantes.length > 0) {
        setError(`Al archivo le faltan columnas obligatorias: ${faltantes.join(", ")}. Usa la plantilla.`);
        return;
      }

      if (leidas.length === 0) {
        setError("El archivo no tiene filas para importar.");
        return;
      }

      setFilas(leidas);
      setVista(await previsualizarImportacionCatalogo(leidas));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible leer el archivo");
    } finally {
      setProcesando(false);
    }
  }

  async function confirmar() {
    setProcesando(true);
    setError(null);

    try {
      await onImportado(await importarCatalogo(filas));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible importar el catalogo");
      // Otra persona pudo cargar un item con el mismo nombre mientras tanto: se vuelve a validar.
      setVista(await previsualizarImportacionCatalogo(filas).catch(() => null));
    } finally {
      setProcesando(false);
    }
  }

  const filasConError = vista?.filas.filter((fila) => fila.errores.length > 0) ?? [];
  const puedeImportar = Boolean(vista) && vista?.resumen.conErrores === 0 && !procesando;

  return (
    <div className="formulario-modulo">
      <p className="texto-secundario">
        Columnas: {COLUMNAS_CATALOGO.map((columna) => `${columna.nombre}${columna.obligatoria ? " *" : ""}`).join(", ")}.
        El tipo es Producto o Insumo; Activo, Si o No. Las categorias que no existen se crean.
      </p>
      <div className="acciones-tabla">
        <button
          className="boton-secundario"
          onClick={() => descargarCsv("plantilla-catalogo.csv", plantillaCatalogo())}
          type="button"
        >
          Descargar plantilla
        </button>
      </div>

      <div className="campo-formulario">
        <label htmlFor="importacion-archivo">Archivo CSV</label>
        <input accept=".csv,text/csv" disabled={procesando} id="importacion-archivo" onChange={(event) => void elegirArchivo(event)} type="file" />
      </div>

      {error ? <MensajeError mensaje={error} /> : null}
      {procesando && !vista ? <p className="texto-secundario">Revisando el archivo...</p> : null}

      {vista ? (
        <section aria-label="Vista previa" className="tarjeta-seccion">
          <p data-testid="importacion-resumen">
            {vista.resumen.total} {vista.resumen.total === 1 ? "fila" : "filas"}: {vista.resumen.validas} para importar
            {vista.resumen.conErrores > 0 ? `, ${vista.resumen.conErrores} con errores` : ""}.
          </p>
          {vista.resumen.categoriasNuevas.length > 0 ? (
            <p className="texto-secundario">Categorias nuevas: {vista.resumen.categoriasNuevas.join(", ")}.</p>
          ) : null}

          {filasConError.length > 0 ? (
            <>
              <p className="texto-secundario">Corregi estas filas en el archivo y volve a elegirlo: no se importa nada hasta que esten todas bien.</p>
              <TablaDatos
                columns={[
                  { header: "Fila", cell: (fila) => fila.numero },
                  { header: "Nombre", cell: (fila) => filas[fila.numero - 2]?.nombre || "-" },
                  { header: "Errores", cell: (fila) => fila.errores.join(" · ") }
                ]}
                data={filasConError}
                keyExtractor={(fila) => String(fila.numero)}
              />
            </>
          ) : null}
        </section>
      ) : null}

      <div className="acciones-formulario">
        <button className="boton-secundario" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="boton-primario" disabled={!puedeImportar} onClick={() => void confirmar()} type="button">
          {procesando && vista ? "Importando..." : `Importar ${vista?.resumen.validas ?? 0} items`}
        </button>
      </div>
    </div>
  );
}
