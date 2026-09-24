// Limite de ingresos fallidos: 5 en 15 minutos bloquean esa cuenta 15 minutos desde el ultimo.
// Por IP el tope es mas alto (varias personas pueden salir por la misma IP) y frena a quien prueba
// muchas cuentas distintas.
export const LIMITE_INTENTOS = {
  maximoPorUsuario: 5,
  maximoPorIp: 20,
  ventanaMs: 15 * 60 * 1000,
  bloqueoMs: 15 * 60 * 1000
} as const;

// Los fallidos no se guardan para siempre: con un dia alcanza para cualquier ventana.
export const RETENCION_INTENTOS_MS = 24 * 60 * 60 * 1000;

// Recibe las fechas de los ultimos fallidos (de la mas nueva a la mas vieja) y devuelve hasta
// cuando queda bloqueado, o null. Bloquea si los ultimos `maximo` ocurrieron dentro de la ventana
// y todavia no paso el bloqueo desde el mas reciente.
export function calcularBloqueo(fallidos: Date[], maximo: number, ahora: Date): Date | null {
  if (fallidos.length < maximo) {
    return null;
  }

  const masReciente = fallidos[0].getTime();
  const primeroDeLaRacha = fallidos[maximo - 1].getTime();

  if (masReciente - primeroDeLaRacha > LIMITE_INTENTOS.ventanaMs) {
    return null;
  }

  const hasta = new Date(masReciente + LIMITE_INTENTOS.bloqueoMs);
  return hasta > ahora ? hasta : null;
}

export function minutosRestantes(hasta: Date, ahora: Date) {
  return Math.max(1, Math.ceil((hasta.getTime() - ahora.getTime()) / 60_000));
}
