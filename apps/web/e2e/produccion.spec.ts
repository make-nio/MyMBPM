import type { Page } from "@playwright/test";

import { crearItem, crearProductoConReceta } from "./api";
import { ADMIN_E2E } from "./entorno";
import { expect, test, unico } from "./fixtures";

async function nuevaOrden(page: Page, observaciones: string) {
  await page.goto("/produccion");
  await page.getByRole("button", { name: "Nueva orden" }).click();
  const modal = page.getByRole("dialog", { name: "Nueva orden" });
  await modal.getByLabel("Observaciones").fill(observaciones);
  await modal.getByRole("button", { name: "Crear orden" }).click();
  await expect(modal).toBeHidden();

  const panel = page.getByRole("region", { name: /^Orden \d+$/ });
  await expect(panel).toBeVisible();
  return panel;
}

async function agregarProducto(page: Page, producto: string, cantidad: string) {
  await page.getByRole("button", { name: "Agregar producto" }).click();
  const modal = page.getByRole("dialog", { name: "Agregar producto" });
  await modal.getByLabel("Producto a fabricar").selectOption({ label: producto });
  await modal.getByLabel("Cantidad").fill(cantidad);
  await modal.getByRole("button", { name: "Guardar producto" }).click();
  await expect(modal).toBeHidden();
}

test("orden completa: consumo de insumos al iniciar e ingreso de productos al finalizar", async ({ page }) => {
  const { producto, insumo } = await crearProductoConReceta({
    producto: unico("PRUEBA-VelaProd"),
    insumo: unico("PRUEBA-Cera"),
    cantidadRequerida: 1.5,
    stockInsumo: 10
  });

  const panel = await nuevaOrden(page, "Tanda de prueba");
  await agregarProducto(page, producto.nombre, "4");

  const consumo = panel.getByRole("region", { name: "Consumo de insumos al iniciar" });
  // 4 velas x 1,5 kg de cera = 6: 10 -> 4
  await expect(consumo.getByRole("row").filter({ hasText: insumo.nombre })).toContainText(/10\s*-6\s*4/);

  await panel.getByRole("button", { name: "Iniciar produccion" }).click();
  await page.getByRole("dialog", { name: "Iniciar produccion" }).getByRole("button", { name: "Iniciar y descontar insumos" }).click();
  await expect(panel.getByTestId("estado-orden")).toHaveText("En proceso");
  await expect(panel.getByRole("button", { name: "Agregar producto" })).toHaveCount(0);

  const movimientos = panel.getByRole("region", { name: "Movimientos de stock de la orden" });
  const egreso = movimientos.getByRole("row").filter({ hasText: insumo.nombre });
  await expect(egreso).toContainText(/Egreso produccion\s*10\s*-6\s*4/);
  await expect(egreso).toContainText(`${ADMIN_E2E.nombre} ${ADMIN_E2E.apellido}`);

  const ingreso = panel.getByRole("region", { name: "Ingreso de productos al finalizar" });
  await expect(ingreso.getByRole("row").filter({ hasText: producto.nombre })).toContainText(/0\s*\+4\s*4/);

  await panel.getByRole("button", { name: "Finalizar produccion" }).click();
  await page.getByRole("dialog", { name: "Finalizar produccion" }).getByRole("button", { name: "Finalizar e ingresar productos" }).click();
  await expect(panel.getByTestId("estado-orden")).toHaveText("Finalizada");
  await expect(movimientos.getByRole("row").filter({ hasText: producto.nombre })).toContainText(/Ingreso produccion\s*0\s*\+4\s*4/);
  await expect(panel.getByRole("button", { name: "Cancelar orden" })).toHaveCount(0);
});

test("no deja iniciar si faltan insumos o un producto no tiene receta", async ({ page }) => {
  const { producto, insumo, idCategoria } = await crearProductoConReceta({
    producto: unico("PRUEBA-Maceta"),
    insumo: unico("PRUEBA-Filamento"),
    cantidadRequerida: 2,
    stockInsumo: 3
  });
  const sinReceta = await crearItem({ idCategoria, nombre: unico("PRUEBA-SinReceta"), tipoItem: "PRODUCTO" });

  const panel = await nuevaOrden(page, "Sin insumos");
  await agregarProducto(page, producto.nombre, "2");

  const consumo = panel.getByRole("region", { name: "Consumo de insumos al iniciar" });
  await expect(consumo.getByRole("row").filter({ hasText: insumo.nombre })).toContainText("(insuficiente)");
  await expect(panel.getByRole("button", { name: "Iniciar produccion" })).toBeDisabled();

  await panel.getByRole("row").filter({ hasText: producto.nombre }).getByRole("button", { name: "Editar" }).click();
  await page.getByRole("dialog", { name: "Editar producto" }).getByLabel("Cantidad").fill("1");
  await page.getByRole("dialog", { name: "Editar producto" }).getByRole("button", { name: "Guardar producto" }).click();
  await expect(panel.getByRole("button", { name: "Iniciar produccion" })).toBeEnabled();

  await agregarProducto(page, sinReceta.nombre, "1");
  await expect(consumo.getByText(`Sin receta activa: ${sinReceta.nombre}`)).toBeVisible();
  await expect(panel.getByRole("button", { name: "Iniciar produccion" })).toBeDisabled();

  await panel.getByRole("row").filter({ hasText: sinReceta.nombre }).getByRole("button", { name: "Quitar" }).click();
  await expect(panel.getByRole("button", { name: "Iniciar produccion" })).toBeEnabled();
});

test("cancelar una orden en proceso avisa que los insumos no vuelven", async ({ page }) => {
  const { producto } = await crearProductoConReceta({
    producto: unico("PRUEBA-Llavero"),
    insumo: unico("PRUEBA-Resina"),
    cantidadRequerida: 1,
    stockInsumo: 5
  });

  const panel = await nuevaOrden(page, "Se cancela");
  await agregarProducto(page, producto.nombre, "1");
  await panel.getByRole("button", { name: "Iniciar produccion" }).click();
  await page.getByRole("dialog", { name: "Iniciar produccion" }).getByRole("button", { name: "Iniciar y descontar insumos" }).click();
  await expect(panel.getByTestId("estado-orden")).toHaveText("En proceso");

  await panel.getByRole("button", { name: "Cancelar orden" }).click();
  const modal = page.getByRole("dialog", { name: "Cancelar orden" });
  await expect(modal).toContainText("NO vuelven al stock");
  await modal.getByRole("button", { name: "Cancelar orden" }).click();

  await expect(panel.getByTestId("estado-orden")).toHaveText("Cancelada");
  await expect(panel.getByRole("button", { name: "Finalizar produccion" })).toHaveCount(0);
});
