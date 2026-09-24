import { prisma } from "../lib/prisma";

import { AlmacenRespaldos, claveDeRespaldo, podarRespaldos } from "./almacen";
import { generarRespaldo } from "./respaldo";

// Lo que corre la Scheduled Function cada dia: respaldar, guardar y dejar las ultimas 14 copias.
// Primero se guarda el nuevo y despues se borran los viejos: si algo falla, no se pierde ninguno.
export async function ejecutarRespaldoDiario(almacen: AlmacenRespaldos, ahora = new Date(), base = prisma) {
  const { manifiesto, contenido, bytesSinComprimir } = await generarRespaldo(base, ahora);
  const clave = claveDeRespaldo(ahora);
  const datos = contenido.buffer.slice(contenido.byteOffset, contenido.byteOffset + contenido.byteLength) as ArrayBuffer;

  await almacen.set(clave, datos, {
    metadata: {
      fecha: manifiesto.fecha,
      ultimaMigracion: manifiesto.ultimaMigracion,
      bytes: contenido.byteLength,
      bytesSinComprimir,
      filas: manifiesto.tablas.reduce((total, tabla) => total + tabla.filas, 0)
    }
  });
  const borrados = await podarRespaldos(almacen);

  return { clave, bytes: contenido.byteLength, bytesSinComprimir, manifiesto, borrados };
}
