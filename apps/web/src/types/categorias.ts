import type { CuerpoDe, RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type Categoria = RespuestaDe<"get /api/categorias/{id}">;

export type CategoriaPayload = CuerpoDe<"post /api/categorias">;
