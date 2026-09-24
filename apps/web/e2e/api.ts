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

export function ajustarStock(
  idItemCatalogo: string,
  cantidad: number,
  tipoStock: "PRODUCTO" | "INSUMO" = "PRODUCTO"
) {
  return api("POST", "/api/stock/ajustes", {
    idItemCatalogo,
    tipoStock,
    tipoMovimiento: cantidad >= 0 ? "AJUSTE_POSITIVO" : "AJUSTE_NEGATIVO",
    cantidad: Math.abs(cantidad),
    observaciones: "PRUEBA: stock inicial para E2E"
  });
}

// Producto activo con precio y stock inicial, listo para usar en pedidos.
export async function crearProductoConStock(nombre: string, precio: number, stock: number) {
  const { idCategoria } = await crearCategoria(`${nombre}-cat`);
  const producto = await crearItem({ idCategoria, nombre, tipoItem: "PRODUCTO", precio });

  if (stock > 0) {
    await ajustarStock(producto.idItemCatalogo, stock);
  }

  return producto;
}

// Producto con receta de un insumo (con stock inicial de INSUMO), listo para producir.
export async function crearProductoConReceta(input: {
  producto: string;
  insumo: string;
  cantidadRequerida: number;
  stockInsumo: number;
}) {
  const { idCategoria } = await crearCategoria(`${input.producto}-cat`);
  const insumo = await crearItem({ idCategoria, nombre: input.insumo, tipoItem: "INSUMO" });
  const producto = await crearItem({ idCategoria, nombre: input.producto, tipoItem: "PRODUCTO", precio: 1000 });

  await api("POST", `/api/items-catalogo/${producto.idItemCatalogo}/componentes`, {
    idItemCatalogoHijo: insumo.idItemCatalogo,
    cantidadRequerida: input.cantidadRequerida,
    unidadMedida: "KG"
  });

  if (input.stockInsumo > 0) {
    await ajustarStock(insumo.idItemCatalogo, input.stockInsumo, "INSUMO");
  }

  return { producto, insumo, idCategoria };
}
