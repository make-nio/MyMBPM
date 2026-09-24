// Argentina no tiene horario de verano: UTC-3 todo el año.
export const OFFSET_ARGENTINA_MS = 3 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Primer instante del dia (hora de Argentina) en el que cae `ahora`.
export function inicioDelDiaArgentina(ahora: Date) {
  const local = new Date(ahora.getTime() - OFFSET_ARGENTINA_MS);

  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + OFFSET_ARGENTINA_MS
  );
}

export function sumarDias(fecha: Date, dias: number) {
  return new Date(fecha.getTime() + dias * UN_DIA_MS);
}

// "2026-09-30" -> 30/09/2026 a las 00:00 de Argentina. Devuelve null si el texto no es un dia
// valido del calendario (por ejemplo "2026-02-30").
export function diaArgentinaAFecha(dia: string) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);

  if (!partes) {
    return null;
  }

  const [anio, mes, diaDelMes] = partes.slice(1).map(Number);
  const utc = new Date(Date.UTC(anio, mes - 1, diaDelMes));

  if (utc.getUTCFullYear() !== anio || utc.getUTCMonth() !== mes - 1 || utc.getUTCDate() !== diaDelMes) {
    return null;
  }

  return new Date(utc.getTime() + OFFSET_ARGENTINA_MS);
}
