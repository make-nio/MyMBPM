const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-09" -> "sep 26" (eje del grafico).
export function etiquetaMesCorta(mes: string) {
  const [anio, numero] = mes.split("-");
  return `${MESES_CORTOS[Number(numero) - 1]} ${anio.slice(2)}`;
}

// "2026-09" -> "septiembre 2026" (textos para leer).
export function etiquetaMesLarga(mes: string) {
  const [anio, numero] = mes.split("-").map(Number);
  const nombre = new Date(Date.UTC(anio, numero - 1, 15)).toLocaleDateString("es-AR", { month: "long", timeZone: "UTC" });
  return `${nombre} ${anio}`;
}

// Alto de cada barra entre 0 y 1, relativo al mes de mayor venta. Sin ventas en todo el periodo,
// todas en 0 (no se divide por cero).
export function alturasRelativas(valores: number[]) {
  const maximo = Math.max(0, ...valores);
  return valores.map((valor) => (maximo > 0 ? Math.max(0, valor) / maximo : 0));
}
