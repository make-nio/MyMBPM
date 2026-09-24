// Scheduled Function: respaldo logico diario de la base en Netlify Blobs (ver docs/respaldos.md).
// Netlify solo la programa en el deploy de produccion publicado, nunca en deploy previews.
import { getStore } from "@netlify/blobs";

import { NOMBRE_ALMACEN } from "../../src/respaldo/almacen";
import { ejecutarRespaldoDiario } from "../../src/respaldo/respaldo-diario";

export default async function respaldoDiario() {
  const resultado = await ejecutarRespaldoDiario(getStore(NOMBRE_ALMACEN));

  // Queda en el log de la function: el tamano sirve de referencia para los limites de Blobs.
  console.log(
    JSON.stringify({
      respaldo: resultado.clave,
      bytes: resultado.bytes,
      bytesSinComprimir: resultado.bytesSinComprimir,
      ultimaMigracion: resultado.manifiesto.ultimaMigracion,
      tablas: resultado.manifiesto.tablas,
      borrados: resultado.borrados
    })
  );
}

// 07:00 UTC = 04:00 en Argentina, cuando nadie esta cargando pedidos.
export const config = { schedule: "0 7 * * *" };
