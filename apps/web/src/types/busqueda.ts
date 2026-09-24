import type { RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type ResultadosBusqueda = RespuestaDe<"get /api/busqueda">;
export type ResultadoPedido = ResultadosBusqueda["pedidos"][number];
export type ResultadoCliente = ResultadosBusqueda["clientes"][number];
export type ResultadoItem = ResultadosBusqueda["items"][number];
