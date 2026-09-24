"use client";

import { useEffect, useState } from "react";

import { formatearEstado, formatearFecha } from "../../../lib/formato";
import { describirCambio, listarHistorialCambios } from "../../../lib/modulos/auditoria";
import { EntidadAuditada, RegistroAuditoria } from "../../../types/auditoria";
import { MensajeError } from "../../ui/mensaje-error";

type HistorialCambiosProps = {
  entidad: EntidadAuditada;
  idEntidad: string;
  // Cambia cuando el registro se edita, para volver a cargar el historial.
  version?: string;
};

// Quien cambio que y cuando. Solo se muestra a administradores (la API tambien lo restringe).
export function HistorialCambios({ entidad, idEntidad, version }: HistorialCambiosProps) {
  const [registros, setRegistros] = useState<RegistroAuditoria[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);

    listarHistorialCambios(entidad, idEntidad)
      .then((data) => vigente && setRegistros(data))
      .catch((currentError: unknown) => {
        if (vigente) {
          setError(currentError instanceof Error ? currentError.message : "No fue posible cargar el historial");
        }
      });

    return () => {
      vigente = false;
    };
  }, [entidad, idEntidad, version]);

  return (
    <div aria-label="Historial de cambios" className="historial-cambios" role="region">
      <p className="marca-pequena">Historial de cambios</p>
      {error ? <MensajeError mensaje={error} /> : null}
      {registros === null && !error ? <p className="texto-secundario">Cargando...</p> : null}
      {registros?.length === 0 ? <p className="texto-secundario">Todavia no hay cambios registrados.</p> : null}
      {registros && registros.length > 0 ? (
        <ol className="historial-cambios__lista">
          {registros.map((registro) => (
            <li key={registro.idAuditoriaCambio}>
              <p className="historial-cambios__titulo">
                <strong>{formatearEstado(registro.accion)}</strong> · {formatearFecha(registro.fecha)} ·{" "}
                {registro.usuario ? `${registro.usuario.nombre} ${registro.usuario.apellido}` : "Sin usuario"}
              </p>
              <ul>
                {registro.cambios.map((cambio) => (
                  <li key={cambio.campo}>{describirCambio(cambio)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
