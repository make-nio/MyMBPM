const moneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const cantidad = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });

const fecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires"
});

// La API serializa los Decimal de Prisma como string ("3001.5").
export function formatearMoneda(valor: string | number | null | undefined) {
  return moneda.format(Number(valor ?? 0));
}

export function formatearCantidad(valor: string | number | null | undefined) {
  return cantidad.format(Number(valor ?? 0));
}

export function formatearFecha(valor: string | null | undefined) {
  return valor ? fecha.format(new Date(valor)) : "-";
}

// Los estados vienen en MAYUSCULAS_CON_GUION ("EN_PREPARACION"); para mostrar: "En preparacion".
export function formatearEstado(valor: string) {
  const texto = valor.replaceAll("_", " ").toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
