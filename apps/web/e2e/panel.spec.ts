import { LIMITES } from "../../api/src/compartido/validaciones/esquemas-comunes";

import type { Page } from "@playwright/test";

import { api, ajustarStock, crearCategoria, crearCliente, crearItem, crearProductoConReceta, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

async function valorIndicador(page: Page, titulo: string) {
  const indicador = page.getByRole("link", { name: new RegExp(`^${titulo}: \\d+$`) });
  await expect(indicador).toBeVisible();
  const etiqueta = (await indicador.getAttribute("aria-label")) ?? "";
  return Number(etiqueta.split(": ")[1]);
}

test("pedidos: el pendiente aparece para confirmar y, al confirmarse, pasa a entregar", async ({ page }) => {
  await page.goto("/panel");
  const pendientesAntes = await valorIndicador(page, "Pedidos pendientes");
  const porEntregarAntes = await valorIndicador(page, "Pedidos por entregar");

  const cliente = await crearCliente(unico("PRUEBA-ClientePanel"));
  const producto = await crearProductoConStock(unico("PRUEBA-ProdPanel"), 100, 5);
  const pedido = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "WHATSAPP"
  });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad: 2 });

  await page.reload();
  expect(await valorIndicador(page, "Pedidos pendientes")).toBe(pendientesAntes + 1);
  await expect(page.getByRole("region", { name: "Para confirmar" })).toContainText(pedido.numeroPedido);

  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);
  await page.reload();
  expect(await valorIndicador(page, "Pedidos pendientes")).toBe(pendientesAntes);
  expect(await valorIndicador(page, "Pedidos por entregar")).toBe(porEntregarAntes + 1);
  await expect(page.getByRole("region", { name: "Para entregar" })).toContainText(pedido.numeroPedido);

  // La confirmacion descuenta stock y aparece entre los ultimos movimientos.
  const movimientos = page.getByRole("region", { name: "Ultimos movimientos" });
  await expect(movimientos.getByRole("listitem").filter({ hasText: producto.nombre }).first()).toContainText(
    /Egreso pedido -2 · queda 3/
  );
});

test("produccion en curso y stock para reponer", async ({ page }) => {
  await page.goto("/panel");
  const enProcesoAntes = await valorIndicador(page, "Ordenes en proceso");
  const stockBajoAntes = await valorIndicador(page, "Stock bajo");

  const { producto } = await crearProductoConReceta({
    producto: unico("PRUEBA-ProdOrdenPanel"),
    insumo: unico("PRUEBA-InsumoPanel"),
    cantidadRequerida: 1,
    stockInsumo: 10
  });
  const orden = await api<{ idOrdenProduccion: string }>("POST", "/api/produccion", {});
  await api("POST", `/api/produccion/${orden.idOrdenProduccion}/detalles`, {
    idItemCatalogoProducto: producto.idItemCatalogo,
    cantidad: 3
  });
  await api("POST", `/api/produccion/${orden.idOrdenProduccion}/iniciar`);

  // Muy por debajo del minimo: queda primero en "Reponer" (los mas urgentes primero). El minimo
  // supera en uno al faltante mas urgente que ya hay en la base (la de E2E se reutiliza entre
  // corridas y otras pruebas dejan faltantes), sin pasar el tope de la API.
  const resumen = await api<{ stockBajo: { items: Array<{ stockMinimo: number; stockActual: string }> } }>("GET", "/api/panel/resumen");
  const masUrgente = resumen.stockBajo.items[0];
  const minimo = (masUrgente ? masUrgente.stockMinimo - Number(masUrgente.stockActual) : 0) + 2;
  expect(minimo, "la base de E2E llego al tope de stockMinimo: recreala").toBeLessThanOrEqual(LIMITES.stockMinimo);
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatPanel"));
  const faltante = await crearItem({ idCategoria, nombre: unico("PRUEBA-Faltante"), tipoItem: "INSUMO", stockMinimo: minimo });
  await ajustarStock(faltante.idItemCatalogo, 1, "INSUMO");

  await page.reload();
  expect(await valorIndicador(page, "Ordenes en proceso")).toBe(enProcesoAntes + 1);
  expect(await valorIndicador(page, "Stock bajo")).toBe(stockBajoAntes + 1);

  await expect(page.getByRole("region", { name: "En produccion" })).toContainText(
    new RegExp(`Orden #${orden.idOrdenProduccion}\\s*3 x ${producto.nombre}`)
  );
  await expect(page.getByRole("region", { name: "Reponer" }).getByRole("listitem").first()).toContainText(
    new RegExp(`${faltante.nombre}\\s*1 de minimo ${minimo}`)
  );

  // Cierra la orden para no dejarla en proceso en la base de E2E.
  await api("POST", `/api/produccion/${orden.idOrdenProduccion}/finalizar`);
});

test("los indicadores llevan a la pantalla de cada modulo", async ({ page }) => {
  await page.goto("/panel");

  await page.getByRole("link", { name: /^Stock bajo: \d+$/ }).click();
  await expect(page).toHaveURL(/\/stock$/);
});
