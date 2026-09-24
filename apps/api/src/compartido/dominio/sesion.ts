// Cuanto dura una sesion (el token de ingreso). JWT_EXPIRES_IN la configura ("8h", "30m",
// "3600"), pero nunca puede pasar de DURACION_MAXIMA: un token robado vale, como mucho, una
// jornada de trabajo.
export const DURACION_POR_DEFECTO_SEGUNDOS = 8 * 60 * 60;
export const DURACION_MAXIMA_SEGUNDOS = 12 * 60 * 60;

const UNIDADES: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

export function duracionSesionSegundos(configurada: string | undefined) {
  const coincidencia = /^\s*(\d+)\s*([smhd]?)\s*$/i.exec(configurada ?? "");
  const segundos = coincidencia
    ? Number(coincidencia[1]) * UNIDADES[(coincidencia[2] || "s").toLowerCase()]
    : DURACION_POR_DEFECTO_SEGUNDOS;

  return Math.min(Math.max(segundos, 60), DURACION_MAXIMA_SEGUNDOS);
}

// Un token emitido (iat, en segundos) antes del corte de sesiones del usuario ya no vale. El corte
// se guarda redondeado al segundo: un ingreso en el mismo segundo del corte sigue valiendo.
export function tokenAnteriorAlCorte(iatSegundos: number | undefined, validasDesde: Date | null) {
  if (!validasDesde) {
    return false;
  }

  return (iatSegundos ?? 0) * 1000 < validasDesde.getTime();
}

export function inicioDelSegundo(fecha: Date) {
  return new Date(Math.floor(fecha.getTime() / 1000) * 1000);
}
