import type { Page } from "@playwright/test";

import { api, ajustarStock, crearCategoria, crearItem } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

// El atajo se registra cuando el encabezado ya esta en pantalla (despues de validar la sesion).
async function abrirConAtajo(page: Page) {
  await expect(page.getByRole("button", { name: /^Buscar Ctrl K$/ })).toBeVisible();
  await page.keyboard.press("Control+k");
}

async function prepararDatos() {
  const marca = unico("PRUEBA-Buscame");
  const { idCategoria } = await crearCategoria(`${marca}-cat`);
  const item = await crearItem({ idCategoria, nombre: `${marca}-Maceta`, tipoItem: "PRODUCTO", precio: 1500, costo: 400 });
  await ajustarStock(item.idItemCatalogo, 3);
  const cliente = await api<{ idCliente: string }>("POST", "/api/clientes", { nombre: `${marca}-Cliente`, telefono: "11 4444-0000" });
  const pedido = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "INSTAGRAM"
  });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: item.idItemCatalogo, cantidad: 1 });

  return { marca, item, cliente, pedido };
}

test("Ctrl+K busca pedidos, clientes e items y cada resultado lleva a su pantalla", async ({ page }) => {
  const { marca, item, cliente, pedido } = await prepararDatos();
  await page.goto("/panel");

  await abrirConAtajo(page);
  const dialogo = page.getByRole("dialog", { name: "Buscar" });
  const entrada = dialogo.getByLabel("Buscar pedidos, clientes e items");
  await expect(entrada).toBeFocused();
  await entrada.fill("P");
  await expect(dialogo).toContainText("Escribi al menos 2 letras o numeros.");

  // Por nombre de cliente aparecen el cliente y su pedido; por nombre, el item (con su costo:
  // el administrador puede verlo).
  await entrada.fill(marca);
  const pedidos = dialogo.getByRole("region", { name: "Pedidos" });
  await expect(pedidos.getByRole("link", { name: new RegExp(pedido.numeroPedido) })).toBeVisible();
  await expect(dialogo.getByRole("region", { name: "Clientes" }).getByRole("link")).toContainText(`${marca}-Cliente`);
  const items = dialogo.getByRole("region", { name: "Items" });
  await expect(items.getByRole("link")).toContainText(`${marca}-Maceta`);
  await expect(items.getByRole("link")).toContainText("Costo $");

  // Flecha abajo lleva al primer resultado; Enter lo abre.
  await entrada.press("ArrowDown");
  await expect(pedidos.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/pedidos/?\\?pedido=${pedido.idPedido}$`));
  await expect(page.getByRole("region", { name: `Pedido ${pedido.numeroPedido}` })).toBeVisible();

  // Por numero de pedido (solo la parte numerica).
  await page.getByRole("button", { name: /^Buscar Ctrl K$/ }).click();
  await dialogo.getByLabel("Buscar pedidos, clientes e items").fill(pedido.numeroPedido.replace("PED-", ""));
  await expect(dialogo.getByRole("region", { name: "Pedidos" }).getByRole("link", { name: new RegExp(pedido.numeroPedido) })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
  await expect(page.getByRole("button", { name: /^Buscar Ctrl K$/ })).toBeFocused();

  // El cliente abre su ficha en Clientes.
  await abrirConAtajo(page);
  await dialogo.getByLabel("Buscar pedidos, clientes e items").fill(`${marca}-Cliente`);
  await dialogo.getByRole("region", { name: "Clientes" }).getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/clientes/?\\?cliente=${cliente.idCliente}$`));
  await expect(page.getByRole("region", { name: `Ficha de ${marca}-Cliente` })).toBeVisible();
  await expect(page.getByLabel("Buscar cliente")).toHaveValue(`${marca}-Cliente`);

  // El item abre su ficha en Items catalogo.
  await abrirConAtajo(page);
  await dialogo.getByLabel("Buscar pedidos, clientes e items").fill(`${marca}-Maceta`);
  await dialogo.getByRole("region", { name: "Items" }).getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/items-catalogo/?\\?item=${item.idItemCatalogo}$`));
  await expect(page.getByRole("dialog", { name: "Editar item" })).toBeVisible();
});

test("sin resultados lo dice", async ({ page }) => {
  await page.goto("/panel");
  await page.getByRole("button", { name: /^Buscar Ctrl K$/ }).click();
  const dialogo = page.getByRole("dialog", { name: "Buscar" });
  await dialogo.getByLabel("Buscar pedidos, clientes e items").fill("zzz-no-existe-nada-asi");
  await expect(dialogo).toContainText('Sin resultados para "zzz-no-existe-nada-asi".');
});

test("un operador busca igual pero sin ver costos", async ({ browser }) => {
  const { marca } = await prepararDatos();
  const usuario = unico("prueba-operador-busqueda").toLowerCase();
  await api("POST", "/api/usuarios", {
    nombre: "Operador",
    apellido: "PRUEBA",
    email: `${usuario}@mymbpm.test`,
    usuario,
    password: "clave-operador-1"
  });
  const login = await fetch(`${URL_WEB}/api/autenticacion/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identificador: usuario, password: "clave-operador-1" })
  });
  const token = ((await login.json()) as { data: { token: string } }).data.token;

  const respuesta = await api<{ items: Array<Record<string, unknown>> }>(
    "GET",
    `/api/busqueda?q=${encodeURIComponent(`${marca}-Maceta`)}`,
    undefined,
    token
  );
  expect(respuesta.items).toHaveLength(1);
  expect(respuesta.items[0]).not.toHaveProperty("costo");
  expect(respuesta.items[0]).toHaveProperty("precio");

  const contexto = await browser.newContext({
    storageState: { cookies: [], origins: [{ origin: URL_WEB, localStorage: [{ name: "mlm_bpm_token", value: token }] }] }
  });
  const page = await contexto.newPage();
  await page.goto(`${URL_WEB}/panel`);
  await abrirConAtajo(page);
  const dialogo = page.getByRole("dialog", { name: "Buscar" });
  await dialogo.getByLabel("Buscar pedidos, clientes e items").fill(`${marca}-Maceta`);
  const items = dialogo.getByRole("region", { name: "Items" });
  await expect(items.getByRole("link")).toContainText("Precio $");
  await expect(items.getByRole("link")).not.toContainText("Costo");
  await contexto.close();
});
