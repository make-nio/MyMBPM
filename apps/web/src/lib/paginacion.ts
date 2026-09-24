// La API no devuelve totales: para saber si hay mas resultados se pide una fila de mas.

// Tope de `limit` que acepta la API (paginacionSchema).
export const LIMITE_API = 100;
export const TAMANO_PAGINA = 50;

export type CargarFilas<T> = (limit: number, offset: number) => Promise<T[]>;

export type Pagina<T> = { items: T[]; hayMas: boolean };

export function partirPagina<T>(filas: T[], tamano: number): Pagina<T> {
  return { items: filas.slice(0, tamano), hayMas: filas.length > tamano };
}

export async function cargarPagina<T>(cargar: CargarFilas<T>, offset: number, tamano = TAMANO_PAGINA) {
  return partirPagina(await cargar(tamano + 1, offset), tamano);
}

// Vuelve a traer, desde el principio, al menos `cantidad` filas (por ejemplo, despues de editar
// una fila de la tercera pagina). Respeta el tope de la API pidiendo en tandas.
export async function cargarHasta<T>(cargar: CargarFilas<T>, cantidad: number): Promise<Pagina<T>> {
  const objetivo = Math.max(cantidad, TAMANO_PAGINA);
  const items: T[] = [];
  let hayMas = false;

  while (items.length < objetivo) {
    const tanda = Math.min(objetivo - items.length, LIMITE_API - 1);
    const pagina = await cargarPagina(cargar, items.length, tanda);
    items.push(...pagina.items);
    hayMas = pagina.hayMas;

    if (!hayMas) {
      break;
    }
  }

  return { items, hayMas };
}

// Todas las filas, en tandas del tope de la API (por ejemplo, para exportar).
export async function cargarTodo<T>(cargar: CargarFilas<T>) {
  const items: T[] = [];

  for (;;) {
    const tanda = await cargar(LIMITE_API, items.length);
    items.push(...tanda);

    if (tanda.length < LIMITE_API) {
      return items;
    }
  }
}
