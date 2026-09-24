import type { Page } from "@playwright/test";

import { ajustarStock, api, crearCategoria, crearCliente, crearItem } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

// "$ 1.234,56" -> 1234.56
function monto(texto: string | null) {
  return Number((texto ?? "").replace(/[^\d,-]/g, "").replace(",", "."));
}

async function montoDelMes(page: Page, id: string) {
  await page.goto("/panel");
  return monto(await page.getByTestId(id).textContent());
}

test("costo por receta: se calcula con los insumos y se puede usar como costo del item", async ({ page }) => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatCosto"));
  const insumo = await crearItem({ idCategoria, nombre: unico("PRUEBA-PLA"), tipoItem: "INSUMO", costo: 2000 });
  const producto = await crearItem({ idCategoria, nombre: unico("PRUEBA-Maceta"), tipoItem: "PRODUCTO", precio: 9000 });
  await api("POST", `/api/items-catalogo/${producto.idItemCatalogo}/componentes`, {
    idItemCatalogoHijo: insumo.idItemCatalogo,
    cantidadRequerida: 1.5,
    unidadMedida: "KG"
  });

  await page.goto("/items-catalogo");
  await page.getByLabel("Buscar item").fill(producto.nombre);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("row").filter({ hasText: producto.nombre }).getByRole("button", { name: "Receta" }).click();

  const costo = page.getByRole("region", { name: "Costo por receta" });
  await expect(costo.getByTestId("costo-receta")).toHaveText(/3\.000,00/);
  await expect(costo).toContainText("Costo cargado: sin cargar");

  await costo.getByRole("button", { name: "Usar como costo" }).click();
  await expect(costo).toContainText(/Costo cargado: \$\s3\.000,00/);
  await expect(costo.getByRole("button", { name: "Usar como costo" })).toHaveCount(0);
});

test("margen del pedido y ventas del mes en el panel", async ({ page }) => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatMargen"));
  const producto = await crearItem({ idCategoria, nombre: unico("PRUEBA-Llavero"), tipoItem: "PRODUCTO", precio: 1000, costo: 400 });
  await ajustarStock(producto.idItemCatalogo, 5);
  const nombreCliente = unico("PRUEBA-ClienteMargen");
  const cliente = await crearCliente(nombreCliente);
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad: 2 });

  const vendidoAntes = await montoDelMes(page, "mes-vendido");
  const gananciaAntes = await montoDelMes(page, "mes-ganancia");

  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);

  await page.goto("/pedidos");
  await page.getByRole("row").filter({ hasText: nombreCliente }).first().getByRole("button", { name: "Ver" }).click();
  const panel = page.getByRole("region", { name: /^Pedido PED-/ });
  await expect(panel.getByTestId("costo-pedido")).toHaveText(/800,00/);
  await expect(panel.getByTestId("ganancia-pedido")).toHaveText(/1\.200,00/);
  await expect(panel).toContainText("(60%)");

  // Lo confirmado hoy suma al mes: 2 x 1000 vendido, 2 x 600 de ganancia.
  expect(await montoDelMes(page, "mes-vendido")).toBeCloseTo(vendidoAntes + 2000, 2);
  expect(await montoDelMes(page, "mes-ganancia")).toBeCloseTo(gananciaAntes + 1200, 2);
});

test("un operador no recibe ni ve costos: ni en la API ni en la pantalla", async ({ browser }) => {
  const usuario = unico("prueba-operador-costos").toLowerCase();
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

  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatOculto"));
  const insumo = await crearItem({ idCategoria, nombre: unico("PRUEBA-InsOculto"), tipoItem: "INSUMO", costo: 500 });
  const producto = await crearItem({ idCategoria, nombre: unico("PRUEBA-ProdOculto"), tipoItem: "PRODUCTO", precio: 1000, costo: 400 });
  await api("POST", `/api/items-catalogo/${producto.idItemCatalogo}/componentes`, {
    idItemCatalogoHijo: insumo.idItemCatalogo,
    cantidadRequerida: 1,
    unidadMedida: "UN"
  });
  const nombreCliente = unico("PRUEBA-ClienteOculto");
  const cliente = await crearCliente(nombreCliente);
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad: 1 });

  // API: el detalle del pedido y el panel no traen costos para el operador.
  const detalle = await api<{ detalles: Array<Record<string, unknown> & { itemCatalogo: Record<string, unknown> }> }>(
    "GET",
    `/api/pedidos/${pedido.idPedido}`,
    undefined,
    token
  );
  expect(detalle.detalles[0]).not.toHaveProperty("costoUnitario");
  expect(detalle.detalles[0].itemCatalogo).not.toHaveProperty("costo");
  expect(detalle.detalles[0]).toHaveProperty("precioUnitario");
  expect(await api("GET", "/api/panel/resumen", undefined, token)).not.toHaveProperty("ventasDelMes");
  // El administrador si los recibe.
  expect(await api("GET", "/api/panel/resumen")).toHaveProperty("ventasDelMes");

  // Pantalla.
  const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await page.goto("/ingresar");
  await page.getByLabel("Usuario o email").fill(usuario);
  await page.getByLabel("Clave").fill("clave-operador-1");
  await page.getByRole("button", { name: /ingresar/i }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("region", { name: "Para confirmar" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Este mes" })).toHaveCount(0);

  await page.goto("/pedidos");
  await page.getByRole("row").filter({ hasText: nombreCliente }).first().getByRole("button", { name: "Ver" }).click();
  const panel = page.getByRole("region", { name: /^Pedido PED-/ });
  await expect(panel.getByTestId("total-pedido")).toHaveText(/1\.000,00/);
  await expect(panel.getByTestId("costo-pedido")).toHaveCount(0);

  await page.goto("/items-catalogo");
  await page.getByLabel("Buscar item").fill(producto.nombre);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("row").filter({ hasText: producto.nombre }).getByRole("button", { name: "Receta" }).click();
  await expect(page.getByRole("heading", { name: `Receta de ${producto.nombre}` })).toBeVisible();
  await expect(page.getByRole("region", { name: "Costo por receta" })).toHaveCount(0);
  await page.close();
});
