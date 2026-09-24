import type { CuerpoDe, RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type Usuario = RespuestaDe<"get /api/usuarios/{id}">;

export type UsuarioAltaPayload = CuerpoDe<"post /api/usuarios">;

// El estado activo se cambia desde la tabla (PATCH /estado), no desde el formulario.
export type UsuarioEdicionPayload = Omit<CuerpoDe<"patch /api/usuarios/{id}">, "activo">;
