"use client";

import { useState } from "react";

import { descargarCsv, diaParaNombreArchivo } from "../../lib/csv";

type BotonExportarCsvProps = {
  // Prefijo del archivo: "pedidos" -> pedidos-2026-09-24.csv
  nombre: string;
  // Trae todas las filas con los filtros aplicados y devuelve el contenido del CSV.
  generar: () => Promise<string>;
};

export function BotonExportarCsv({ nombre, generar }: BotonExportarCsvProps) {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportar() {
    setExportando(true);
    setError(null);

    try {
      descargarCsv(`${nombre}-${diaParaNombreArchivo()}.csv`, await generar());
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible exportar");
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <button className="boton-secundario" disabled={exportando} onClick={() => void exportar()} type="button">
        {exportando ? "Exportando..." : "Exportar CSV"}
      </button>
      {error ? (
        <span className="mensaje-error" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}
