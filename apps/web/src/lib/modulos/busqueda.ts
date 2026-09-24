import { pedirApi } from "../api";

// Minimo de caracteres para buscar (el mismo que valida la API).
export const MINIMO_BUSQUEDA = 2;

export function buscarGlobal(texto: string) {
  return pedirApi("get /api/busqueda", { consulta: { q: texto } });
}

// A que pantalla lleva cada resultado. Clientes e items abren su ficha de edicion.
export const rutaResultado = {
  pedido: (idPedido: string) => `/pedidos?pedido=${idPedido}`,
  cliente: (idCliente: string) => `/clientes?cliente=${idCliente}`,
  item: (idItemCatalogo: string) => `/items-catalogo?item=${idItemCatalogo}`
};
