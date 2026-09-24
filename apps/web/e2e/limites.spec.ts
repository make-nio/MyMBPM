import { LIMITES } from "../../api/src/compartido/validaciones/esquemas-comunes";

import { api, crearCliente, crearProductoConStock } from "./api";
import { revisarContratoFetch } from "./contrato";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

// Limites de entrada (LIMITES en apps/api/src/compartido/validaciones/esquemas-comunes.ts, que el
// contrato toma de los mismos schemas): uno de mas se rechaza con 400/409 y un mensaje, nunca con
// un 500 ni pasando.

let token = "";

async function pedir(metodo: string, ruta: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${URL_WEB}${ruta}`, {
    method: metodo,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });
  const json = await respuesta.json().catch(() => null);
  // Tambien los errores cumplen el contrato (formato comun).
  expect(revisarContratoFetch(metodo, `${URL_WEB}${ruta}`, respuesta.status, json)).toEqual([]);
  return { status: respuesta.status, json: json as { data?: unknown[]; error?: { message: string } } };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/panel");
  token = (await page.evaluate(() => window.localStorage.getItem("mlm_bpm_token"))) ?? "";
});

test("textos, paginacion e ids: uno de mas es 400", async () => {
  expect((await pedir("POST", "/api/clientes", { nombre: "x".repeat(121) })).status).toBe(400);
  expect((await pedir("POST", "/api/clientes", { nombre: "x".repeat(120) })).status).toBe(201);

  expect((await pedir("GET", "/api/clientes?limit=101")).status).toBe(400);
  expect((await pedir("GET", `/api/clientes?offset=${LIMITES.offset + 1}`)).status).toBe(400);

  // Un id mas grande que el BIGINT de Postgres no llega a la base (antes: 500).
  expect((await pedir("GET", "/api/clientes/99999999999999999999")).status).toBe(400);
  expect((await pedir("GET", "/api/clientes/9223372036854775807")).status).toBe(404);
});

test("cantidades y montos: uno de mas es 400", async () => {
  const cliente = await crearCliente(unico("PRUEBA-ClienteLimites"));
  const producto = await crearProductoConStock(unico("PRUEBA-ProdLimites"), 100, 0);
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });

  const linea = (cantidad: number) =>
    pedir("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad });
  expect((await linea(LIMITES.cantidad + 1)).status).toBe(400);
  expect((await linea(LIMITES.cantidad)).status).toBe(201);

  const precio = (valor: number) => pedir("PATCH", `/api/items-catalogo/${producto.idItemCatalogo}`, { precio: valor });
  expect((await precio(LIMITES.monto + 1)).status).toBe(400);
  expect((await precio(LIMITES.monto)).status).toBe(200);
});

test("un pedido tiene como mucho 100 lineas", async () => {
  const cliente = await crearCliente(unico("PRUEBA-ClienteLineas"));
  const producto = await crearProductoConStock(unico("PRUEBA-ProdLineas"), 10, 0);
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });

  for (let i = 0; i < LIMITES.lineasPorPedido; i++) {
    await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad: 1 });
  }

  const demas = await pedir("POST", `/api/pedidos/${pedido.idPedido}/detalles`, {
    idItemCatalogo: producto.idItemCatalogo,
    cantidad: 1
  });
  expect(demas.status).toBe(409);
  expect(demas.json.error?.message).toContain(`como mucho ${LIMITES.lineasPorPedido} lineas`);
});

test("las existencias sin limit devuelven una pagina, no todo", async () => {
  const respuesta = await pedir("GET", "/api/stock/existencias");
  expect(respuesta.status).toBe(200);
  expect((respuesta.json.data ?? []).length).toBeLessThanOrEqual(100);
});
