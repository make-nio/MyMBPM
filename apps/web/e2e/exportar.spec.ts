import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { ajustarStock, api, crearCategoria, crearCliente, crearItem } from "./api";
import { expect, test, unico } from "./fixtures";

// Dia de Argentina (AAAA-MM-DD) a `dias` de hoy.
function diaDesdeHoy(dias: number) {
  const fecha = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(fecha);
}

async function descargar(page: Page) {
  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar CSV" }).click()
  ]);
  const ruta = await descarga.path();
  return { nombre: descarga.suggestedFilename(), contenido: await readFile(ruta, "utf8") };
}

test("pedidos: filtra por fecha de alta y exporta lo filtrado, no solo lo que se ve", async ({ page }) => {
  const nombreCliente = unico("PRUEBA-ClienteCsv");
  const cliente = await crearCliente(nombreCliente, "Perez; Gomez");
  const pedido = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "INSTAGRAM",
    fechaEntrega: diaDesdeHoy(5)
  });

  await page.goto("/pedidos");
  const hoy = diaDesdeHoy(0);
  await page.getByLabel("Alta desde").fill(hoy);
  await page.getByLabel("hasta", { exact: true }).fill(hoy);
  await expect(page.getByRole("row").filter({ hasText: pedido.numeroPedido })).toBeVisible();

  const { nombre, contenido } = await descargar(page);
  expect(nombre).toBe(`pedidos-${hoy}.csv`);
  expect(contenido.startsWith("﻿Numero;Alta;Cliente;Estado;Cobro;Origen;Entrega prometida;Total\r\n")).toBe(true);
  const fila = contenido.split("\r\n").find((linea) => linea.startsWith(`${pedido.numeroPedido};`));
  expect(fila).toBeDefined();
  // El apellido tiene ";": va entre comillas para no partir la columna.
  expect(fila).toContain(`;"${nombreCliente} Perez; Gomez";Pendiente;Pendiente;Instagram;${diaDesdeHoy(5).split("-").reverse().join("/")};0`);

  // Con el rango en manana el pedido de hoy queda afuera.
  await page.getByLabel("Alta desde").fill(diaDesdeHoy(1));
  await page.getByLabel("hasta", { exact: true }).fill(diaDesdeHoy(1));
  await expect(page.getByText("No encontramos pedidos")).toBeVisible();

  // Rango invertido: avisa y no lo aplica.
  await page.getByLabel("hasta", { exact: true }).fill(hoy);
  await expect(page.getByText("La fecha desde es posterior a la fecha hasta")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: pedido.numeroPedido })).toBeVisible();
});

test("stock: exporta las existencias con los filtros aplicados", async ({ page }) => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatCsv"));
  const lote = unico("PRUEBA-StockCsv");
  const hilo = await crearItem({ idCategoria, nombre: `${lote}-Hilo`, tipoItem: "INSUMO", stockMinimo: 5 });
  await crearItem({ idCategoria, nombre: `${lote}-Figura`, tipoItem: "PRODUCTO" });
  await ajustarStock(hilo.idItemCatalogo, 2.5, "INSUMO");

  await page.goto("/stock");
  await page.getByLabel("Buscar item").fill(lote);
  await page.getByLabel("Filtrar por tipo").selectOption("INSUMO");
  await expect(page.getByRole("row").filter({ hasText: `${lote}-Figura` })).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${lote}-Hilo` })).toBeVisible();

  const { nombre, contenido } = await descargar(page);
  expect(nombre).toMatch(/^stock-\d{4}-\d{2}-\d{2}\.csv$/);
  const lineas = contenido.replace("﻿", "").trimEnd().split("\r\n");
  expect(lineas[0]).toBe("Item;Tipo;Categoria;Stock;Minimo;Estado;Ultimo movimiento");
  expect(lineas.slice(1)).toHaveLength(1);
  expect(lineas[1]).toMatch(new RegExp(`^${lote}-Hilo;Insumo;PRUEBA-CatCsv-[^;]+;2,5;5;Bajo minimo;\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}$`));
});
