import { readFileSync } from "node:fs";

import { ARCHIVO_SESION_ADMIN, URL_WEB } from "./entorno";

type Respuesta<T> = { ok: boolean; data: T };

function tokenAdmin() {
  const sesion = JSON.parse(readFileSync(ARCHIVO_SESION_ADMIN, "utf8"));
  return sesion.origins[0].localStorage[0].value as string;
}

// Prepara datos por la API (con la sesion del administrador E2E) para que cada prueba
// ejercite por la UI solo la pantalla que le toca.
export async function api<T>(method: string, path: string, body?: unknown, token = tokenAdmin()) {
  const response = await fetch(`${URL_WEB}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = (await response.json()) as Respuesta<T>;

  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(json)}`);
  }

  return json.data;
}

export function crearCategoria(nombre: string) {
  return api<{ idCategoria: string }>("POST", "/api/categorias", {
    nombre,
    slug: nombre.toLowerCase()
  });
}

export function crearItem(input: {
  idCategoria: string;
  nombre: string;
  tipoItem: "PRODUCTO" | "INSUMO";
  precio?: number;
  stockMinimo?: number;
}) {
  return api<{ idItemCatalogo: string; nombre: string }>("POST", "/api/items-catalogo", {
    ...input,
    slug: input.nombre.toLowerCase()
  });
}

export function crearCliente(nombre: string, apellido?: string) {
  return api<{ idCliente: string }>("POST", "/api/clientes", { nombre, apellido });
}
