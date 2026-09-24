"use client";

import { ChangeEvent, useState } from "react";

import { MensajeError } from "../../ui/mensaje-error";
import { TablaDatos } from "../../ui/tabla-datos";
import { descargarCsv, leerCsv } from "../../../lib/csv";
import { COLUMNAS_CLIENTES, mapearFilasClientes, plantillaClientes } from "../../../lib/importacion/clientes";
import { importarClientes, previsualizarImportacionClientes } from "../../../lib/modulos/importacion-clientes";
import {
  FilaImportacionCliente,
  PrevisualizacionClientes,
  ResultadoImportacionClientes
} from "../../../types/importacion-clientes";

type ImportarClientesProps = {
  onCancel: () => void;
  onImportado: (resultado: ResultadoImportacionClientes) => Promise<void> | void;
};

// Importacion de clientes desde un CSV, con el mismo circuito que la del catalogo: archivo, vista
// previa con los errores por fila y, si no hay ninguno, confirmar. La API crea todo o nada.
export function ImportarClientes({ onCancel, onImportado }: ImportarClientesProps) {
  const [filas, setFilas] = useState<FilaImportacionCliente[]>([]);
  const [vista, setVista] = useState<PrevisualizacionClientes | null>(null);
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
      const { filas: leidas, faltantes } = mapearFilasClientes(leerCsv(await archivo.text()));

      if (faltantes.length > 0) {
        setError(`Al archivo le faltan columnas obligatorias: ${faltantes.join(", ")}. Usa la plantilla.`);
        return;
      }

      if (leidas.length === 0) {
        setError("El archivo no tiene filas para importar.");
        return;
      }

      setFilas(leidas);
      setVista(await previsualizarImportacionClientes(leidas));
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
      await onImportado(await importarClientes(filas));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible importar los clientes");
      // Otra persona pudo cargar el mismo cliente mientras tanto: se vuelve a validar.
      setVista(await previsualizarImportacionClientes(filas).catch(() => null));
    } finally {
      setProcesando(false);
    }
  }

  const filasConError = vista?.filas.filter((fila) => fila.errores.length > 0) ?? [];
  const puedeImportar = Boolean(vista) && vista?.resumen.conErrores === 0 && !procesando;

  return (
    <div className="formulario-modulo">
      <p className="texto-secundario">
        Columnas: {COLUMNAS_CLIENTES.map((columna) => `${columna.nombre}${columna.obligatoria ? " *" : ""}`).join(", ")}.
        Activo es Si o No. Un cliente que ya existe (mismo email, documento, o nombre + apellido + telefono) da error y
        no se duplica.
      </p>
      <div className="acciones-tabla">
        <button
          className="boton-secundario"
          onClick={() => descargarCsv("plantilla-clientes.csv", plantillaClientes())}
          type="button"
        >
          Descargar plantilla
        </button>
      </div>

      <div className="campo-formulario">
        <label htmlFor="importacion-clientes-archivo">Archivo CSV</label>
        <input accept=".csv,text/csv" disabled={procesando} id="importacion-clientes-archivo" onChange={(event) => void elegirArchivo(event)} type="file" />
      </div>

      {error ? <MensajeError mensaje={error} /> : null}
      {procesando && !vista ? <p className="texto-secundario">Revisando el archivo...</p> : null}

      {vista ? (
        <section aria-label="Vista previa" className="tarjeta-seccion">
          <p data-testid="importacion-resumen">
            {vista.resumen.total} {vista.resumen.total === 1 ? "fila" : "filas"}: {vista.resumen.validas} para importar
            {vista.resumen.conErrores > 0 ? `, ${vista.resumen.conErrores} con errores` : ""}.
          </p>

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
          {procesando && vista ? "Importando..." : `Importar ${vista?.resumen.validas ?? 0} clientes`}
        </button>
      </div>
    </div>
  );
}
