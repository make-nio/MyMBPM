import type { Page } from "@playwright/test";

import { ajustarStock, api, crearCategoria, crearCliente, crearItem, crearProductoConReceta } from "./api";
import { ADMIN_E2E } from "./entorno";
import { expect, test, unico } from "./fixtures";

// Fila del listado cuyo primer dato es exactamente ese nombre (la categoria puede contenerlo).
function filaDe(page: Page, nombre: string) {
  return page.getByRole("row").filter({ has: page.getByRole("cell", { name: nombre, exact: true }) });
}

// Columnas del listado: Item, Tipo, Categoria, Stock, Minimo, Estado, Ultimo movimiento, Acciones.
async function esperarFila(page: Page, nombre: string, esperado: { stock: string; minimo: string; estado: string }) {
  const celdas = filaDe(page, nombre).getByRole("cell");
  await expect(celdas.nth(3)).toHaveText(esperado.stock);
  await expect(celdas.nth(4)).toHaveText(esperado.minimo);
  await expect(celdas.nth(5)).toHaveText(esperado.estado);
}

test("existencias por tipo, busqueda y filtro de bajo minimo", async ({ page }) => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatStock"));
  const producto = await crearItem({ idCategoria, nombre: unico("PRUEBA-Bajo"), tipoItem: "PRODUCTO", stockMinimo: 5 });
  const insumo = await crearItem({ idCategoria, nombre: unico("PRUEBA-InsumoOk"), tipoItem: "INSUMO", stockMinimo: 3 });
  await ajustarStock(producto.idItemCatalogo, 2);
  await ajustarStock(insumo.idItemCatalogo, 10, "INSUMO");

  await page.goto("/stock");
  const filaProducto = filaDe(page, producto.nombre);
  const filaInsumo = filaDe(page, insumo.nombre);
  await esperarFila(page, producto.nombre, { stock: "2", minimo: "5", estado: "Bajo minimo" });
  // El insumo se mide contra su stock de INSUMO (antes bajo-stock lo comparaba con PRODUCTO = 0).
  await esperarFila(page, insumo.nombre, { stock: "10", minimo: "3", estado: "OK" });

  await page.getByLabel(/Solo bajo minimo/).check();
  await expect(filaProducto).toBeVisible();
  await expect(filaInsumo).toHaveCount(0);

  await page.getByLabel(/Solo bajo minimo/).uncheck();
  await page.getByLabel("Filtrar por tipo").selectOption("INSUMO");
  await expect(filaProducto).toHaveCount(0);
  await expect(filaInsumo).toBeVisible();

  await page.getByLabel("Filtrar por tipo").selectOption("");
  await page.getByLabel("Buscar item").fill(producto.nombre.toLowerCase());
  await expect(page.getByRole("row")).toHaveCount(2);
});

test("ajuste manual: valida stock y motivo, y queda en los movimientos con el usuario", async ({ page }) => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatAjuste"));
  const insumo = await crearItem({ idCategoria, nombre: unico("PRUEBA-Hilo"), tipoItem: "INSUMO" });
  await ajustarStock(insumo.idItemCatalogo, 10, "INSUMO");

  await page.goto("/stock");
  const fila = filaDe(page, insumo.nombre);
  await fila.getByRole("button", { name: "Ajustar" }).click();

  const modal = page.getByRole("dialog", { name: "Ajustar stock" });
  await modal.getByLabel("Tipo de ajuste").selectOption("AJUSTE_NEGATIVO");
  await modal.getByLabel("Cantidad").fill("20");
  await expect(modal.getByText("No hay stock suficiente para ese egreso.")).toBeVisible();
  await expect(modal.getByRole("button", { name: "Registrar ajuste" })).toBeDisabled();

  await modal.getByLabel("Cantidad").fill("4");
  await expect(modal.getByTestId("ajuste-resultante")).toContainText("6");
  await modal.getByRole("button", { name: "Registrar ajuste" }).click();
  await expect(modal.getByText("Indica el motivo del ajuste")).toBeVisible();

  await modal.getByLabel("Motivo").fill("Conteo fisico");
  await modal.getByRole("button", { name: "Registrar ajuste" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByRole("status")).toContainText(`Ajuste registrado para ${insumo.nombre}`);
  await esperarFila(page, insumo.nombre, { stock: "6", minimo: "0", estado: "OK" });

  const panel = page.getByRole("region", { name: `Stock de ${insumo.nombre}` });
  const ultimo = panel.getByRole("region", { name: "Movimientos" }).getByRole("row").nth(1);
  await expect(ultimo).toContainText(/Ajuste negativo\s*Manual\s*10\s*-4\s*6/);
  await expect(ultimo).toContainText(`${ADMIN_E2E.nombre} ${ADMIN_E2E.apellido}`);
  await expect(ultimo).toContainText("Conteo fisico");
});

test("detalle de un producto: capacidad segun receta y movimientos con su origen", async ({ page }) => {
  const { producto, insumo } = await crearProductoConReceta({
    producto: unico("PRUEBA-Figura"),
    insumo: unico("PRUEBA-Resina"),
    cantidadRequerida: 1.5,
    stockInsumo: 10
  });
  await ajustarStock(producto.idItemCatalogo, 3);

  const cliente = await crearCliente(unico("PRUEBA-ClienteStock"));
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "MANUAL"
  });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad: 2 });
  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);

  await page.goto("/stock");
  await filaDe(page, producto.nombre).getByRole("button", { name: "Movimientos" }).click();

  const panel = page.getByRole("region", { name: `Stock de ${producto.nombre}` });
  await expect(panel.getByTestId("stock-detalle")).toHaveText("1");
  // 10 kg de resina / 1,5 por unidad = 6 unidades
  await expect(panel.getByTestId("capacidad-produccion")).toHaveText("6");
  await expect(panel.getByRole("row").filter({ hasText: insumo.nombre })).toContainText(/1,5\s*10\s*6 u\./);

  const movimientos = panel.getByRole("region", { name: "Movimientos" });
  await expect(movimientos.getByRole("row").nth(1)).toContainText(new RegExp(`Egreso pedido\\s*Pedido #${pedido.idPedido}\\s*3\\s*-2\\s*1`));
});

test("el historial de stock no expone datos sensibles del usuario", async () => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatSeguridad"));
  const item = await crearItem({ idCategoria, nombre: unico("PRUEBA-Seguridad"), tipoItem: "INSUMO" });
  await ajustarStock(item.idItemCatalogo, 1, "INSUMO");

  const historial = await api<Array<{ usuario: Record<string, unknown> | null }>>(
    "GET",
    `/api/stock/historial?idItemCatalogo=${item.idItemCatalogo}`
  );

  expect(historial).toHaveLength(1);
  expect(Object.keys(historial[0].usuario ?? {}).sort()).toEqual(["apellido", "idUsuario", "nombre"]);
});
