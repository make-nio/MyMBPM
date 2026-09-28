"use client";

import { useEffect, useState } from "react";

import { EstadoVacio } from "../../ui/estado-vacio";
import { MensajeError } from "../../ui/mensaje-error";
import { TablaDatos } from "../../ui/tabla-datos";
import { formatearEstado, formatearMoneda } from "../../../lib/formato";
import { obtenerCobrosDelMes } from "../../../lib/modulos/reportes";
import { CobrosDelMes as Cobros } from "../../../types/pagos";

// Lo cobrado en el mes por medio de pago (#90): pagos vigentes segun su fecha. No es lo vendido
// (que cuenta la confirmacion del pedido): un pedido se puede cobrar en otro mes.
export function CobrosDelMes({ mes }: { mes: string }) {
  const [cobros, setCobros] = useState<Cobros | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setCobros(null);
    setError(null);
    obtenerCobrosDelMes(mes)
      .then((datos) => vigente && setCobros(datos))
      .catch((causa) => vigente && setError(causa instanceof Error ? causa.message : "No fue posible cargar lo cobrado"));

    return () => {
      vigente = false;
    };
  }, [mes]);

  return (
    <section aria-label="Cobrado por medio de pago" className="tarjeta-seccion">
      <p className="marca-pequena">Cobrado en el mes</p>
      {error ? <MensajeError mensaje={error} /> : null}
      {cobros ? (
        cobros.porMedio.length === 0 ? (
          <EstadoVacio descripcion="No hay pagos registrados en el mes." titulo="Sin cobros" />
        ) : (
          <>
            <p>
              Total cobrado: <strong data-testid="reporte-cobrado">{formatearMoneda(cobros.total)}</strong>
            </p>
            <TablaDatos
              columns={[
                { header: "Medio de pago", cell: (medio) => formatearEstado(medio.medioPago) },
                { header: "Pagos", cell: (medio) => medio.pagos },
                { header: "Cobrado", cell: (medio) => formatearMoneda(medio.cobrado) }
              ]}
              data={cobros.porMedio}
              keyExtractor={(medio) => medio.medioPago}
            />
          </>
        )
      ) : null}
    </section>
  );
}
