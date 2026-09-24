import { apiFetch, buildQuery } from "../api";
import { ResultadosBusqueda } from "../../types/busqueda";

// Minimo de caracteres para buscar (el mismo que valida la API).
export const MINIMO_BUSQUEDA = 2;

export function buscarGlobal(texto: string) {
  return apiFetch<{ ok: true; data: ResultadosBusqueda }>(`/api/busqueda${buildQuery({ q: texto })}`).then(
    (response) => response.data
  );
}

// A que pantalla lleva cada resultado. Clientes e items abren su ficha de edicion.
export const rutaResultado = {
  pedido: (idPedido: string) => `/pedidos?pedido=${idPedido}`,
  cliente: (idCliente: string) => `/clientes?cliente=${idCliente}`,
  item: (idItemCatalogo: string) => `/items-catalogo?item=${idItemCatalogo}`
};
