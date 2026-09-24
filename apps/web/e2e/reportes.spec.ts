import { readFile } from "node:fs/promises";

import { ajustarStock, api, crearCategoria, crearCliente, crearItem } from "./api";
import { revisarAccesibilidad } from "./accesibilidad";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

// Pedido confirmado hoy: entra en el reporte del mes en curso.
async function venderHoy(idCliente: string, idItemCatalogo: string, cantidad: number) {
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente, origenPedido: "MANUAL" });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo, cantidad });
  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);
  return pedido;
}

test("ventas del mes por item y por cliente, con su CSV", async ({ page }) => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatReporte"));
  const producto = await crearItem({ idCategoria, nombre: unico("PRUEBA-ProdReporte"), tipoItem: "PRODUCTO", precio: 1000, costo: 400 });
  await ajustarStock(producto.idItemCatalogo, 10);
  const nombreCliente = unico("PRUEBA-ClienteReporte");
  const cliente = await crearCliente(nombreCliente);
  await venderHoy(cliente.idCliente, producto.idItemCatalogo, 2);
  await venderHoy(cliente.idCliente, producto.idItemCatalogo, 1);
  // Un pedido cancelado no cuenta como vendido.
  const cancelado = await venderHoy(cliente.idCliente, producto.idItemCatalogo, 5);
  await api("PATCH", `/api/pedidos/${cancelado.idPedido}/estado`, { estadoPedido: "CANCELADO" });

  await page.goto("/reportes");
  const porItem = page.getByRole("region", { name: "Por item" });
  // Item, Cantidad, Pedidos, Vendido, Costo, Ganancia
  const filaItem = porItem.getByRole("row").filter({ hasText: producto.nombre }).getByRole("cell");
  await expect(filaItem.nth(1)).toHaveText("3");
  await expect(filaItem.nth(2)).toHaveText("2");
  await expect(filaItem.nth(3)).toHaveText(/3\.000,00/);
  await expect(filaItem.nth(4)).toHaveText(/1\.200,00/);
  await expect(filaItem.nth(5)).toHaveText(/1\.800,00/);

  const porCliente = page.getByRole("region", { name: "Por cliente" });
  const filaCliente = porCliente.getByRole("row").filter({ hasText: nombreCliente }).getByRole("cell");
  await expect(filaCliente.nth(1)).toHaveText("2");
  await expect(filaCliente.nth(2)).toHaveText(/3\.000,00/);

  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    porItem.getByRole("button", { name: "Exportar CSV" }).click()
  ]);
  const contenido = await readFile(await descarga.path(), "utf8");
  expect(descarga.suggestedFilename()).toMatch(/^ventas-por-item-\d{4}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(contenido.startsWith("﻿Item;Cantidad;Pedidos;Vendido;Costo;Ganancia\r\n")).toBe(true);
  expect(contenido).toContain(`\r\n${producto.nombre};3;2;3000;1200;1800\r\n`);

  // Un mes sin ventas.
  await page.getByLabel("Mes", { exact: true }).fill("2001-01");
  await expect(page.getByTestId("reporte-pedidos")).toHaveText("0");
  await expect(porItem.getByText("No hubo ventas en el mes.")).toBeVisible();
});

test("un operador no ve Reportes ni puede pedirlos a la API", async ({ browser }) => {
  const usuario = unico("prueba-operador-reportes").toLowerCase();
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

  const respuesta = await fetch(`${URL_WEB}/api/reportes/ventas-mes`, { headers: { authorization: `Bearer ${token}` } });
  expect(respuesta.status).toBe(403);
  const porMes = await fetch(`${URL_WEB}/api/reportes/ventas-por-mes`, { headers: { authorization: `Bearer ${token}` } });
  expect(porMes.status).toBe(403);

  const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await page.goto("/ingresar");
  await page.getByLabel("Usuario o email").fill(usuario);
  await page.getByLabel("Clave").fill("clave-operador-1");
  await page.getByRole("button", { name: /ingresar/i }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("link", { name: "Reportes" })).toHaveCount(0);

  await page.goto("/reportes");
  await expect(page.getByText("Sin acceso")).toBeVisible();
  await page.close();
});

test("grafico de los ultimos 12 meses: lo vendido del mes suma y cada mes lleva a su reporte", async ({ page }) => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatGrafico"));
  const producto = await crearItem({ idCategoria, nombre: unico("PRUEBA-ProdGrafico"), tipoItem: "PRODUCTO", precio: 700 });
  await ajustarStock(producto.idItemCatalogo, 10);
  const cliente = await crearCliente(unico("PRUEBA-ClienteGrafico"));

  const antes = await api<{ meses: Array<{ mes: string; vendido: string; pedidos: number }> }>("GET", "/api/reportes/ventas-por-mes");
  expect(antes.meses).toHaveLength(12);
  const actual = antes.meses[11];
  await venderHoy(cliente.idCliente, producto.idItemCatalogo, 3);
  const despues = await api<typeof antes>("GET", "/api/reportes/ventas-por-mes");
  expect(Number(despues.meses[11].vendido)).toBeCloseTo(Number(actual.vendido) + 2100, 2);
  expect(despues.meses[11].pedidos).toBe(actual.pedidos + 1);

  await page.goto("/reportes");
  const grafico = page.getByRole("region", { name: "Ventas de los ultimos 12 meses" });
  await expect(grafico.getByRole("img", { name: /^Vendido por mes\./ })).toBeVisible();
  await expect(grafico.locator(`[data-mes="${actual.mes}"]`)).toHaveClass(/grafico-ventas__barra--elegida/);

  await grafico.getByText("Ver los datos").click();
  const anterior = despues.meses[10].mes;
  await grafico.getByRole("button", { name: /^Ver [a-z]+ \d{4}$/ }).nth(10).click();
  await expect(page.getByLabel("Mes", { exact: true })).toHaveValue(anterior);
  await expect(grafico.locator(`[data-mes="${anterior}"]`)).toHaveClass(/grafico-ventas__barra--elegida/);
  await revisarAccesibilidad(page, "grafico de ventas");
});
