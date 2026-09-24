// Donde se guardan los respaldos diarios (Netlify Blobs, store "respaldos"). La interfaz minima
// permite probar la rotacion sin Netlify.
export type AlmacenRespaldos = {
  set(clave: string, datos: ArrayBuffer, opciones?: { metadata?: Record<string, unknown> }): Promise<unknown>;
  list(): Promise<{ blobs: Array<{ key: string }> }>;
  delete(clave: string): Promise<unknown>;
};

export const NOMBRE_ALMACEN = "respaldos";
export const COPIAS_A_CONSERVAR = 14;
const PREFIJO = "respaldo-";

// respaldo-2026-09-24T07-00-00Z.ndjson.gz: ordenar por nombre es ordenar por fecha.
export function claveDeRespaldo(fecha: Date) {
  return `${PREFIJO}${fecha.toISOString().replace(/\.\d{3}Z$/, "Z").replaceAll(":", "-")}.ndjson.gz`;
}

// Borra los respaldos mas viejos y deja los ultimos `conservar`. Devuelve las claves borradas.
export async function podarRespaldos(almacen: AlmacenRespaldos, conservar = COPIAS_A_CONSERVAR) {
  const { blobs } = await almacen.list();
  const claves = blobs
    .map((blob) => blob.key)
    .filter((clave) => clave.startsWith(PREFIJO))
    .sort();
  const aBorrar = claves.slice(0, Math.max(0, claves.length - conservar));

  for (const clave of aBorrar) {
    await almacen.delete(clave);
  }

  return aBorrar;
}
