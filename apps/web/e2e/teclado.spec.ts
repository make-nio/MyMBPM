import type { Locator, Page } from "@playwright/test";

import { crearCliente, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

// Todo con teclado: Tab, Shift+Tab, Enter, flechas y escribir. Ningun click.

async function tieneFoco(locator: Locator) {
  return locator.evaluate((elemento) => elemento === document.activeElement).catch(() => false);
}

// Aprieta Tab hasta que el foco llega al control; falla si no llega en `maximo` pasos.
async function tabHasta(page: Page, destino: Locator, maximo = 60) {
  for (let paso = 0; paso < maximo; paso += 1) {
    if (await tieneFoco(destino)) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error(`Con ${maximo} Tab el foco no llego a ${destino}`);
}

async function enfocadoDentro(contenedor: Locator) {
  return contenedor.evaluate((elemento) => elemento.contains(document.activeElement));
}

test("un pedido completo solo con teclado: alta, item, confirmacion y comprobante", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteTeclado");
  await crearCliente(cliente);
  const producto = await crearProductoConStock(unico("PRUEBA-ProdTeclado"), 1500, 10);
  // window.print abre el dialogo del sistema: se reemplaza para contar la llamada.
  await page.addInitScript(() => {
    (window as unknown as { impresiones: number }).impresiones = 0;
    window.print = () => {
      (window as unknown as { impresiones: number }).impresiones += 1;
    };
  });

  await page.goto("/pedidos");
  const nuevo = page.getByRole("button", { name: "Nuevo pedido" });
  await expect(nuevo).toBeVisible();

  // Alta: el foco entra al dialogo, en la busqueda del cliente.
  await tabHasta(page, nuevo);
  await page.keyboard.press("Enter");
  const alta = page.getByRole("dialog", { name: "Nuevo pedido" });
  await expect(alta).toBeVisible();
  await expect(alta.getByLabel("Buscar cliente")).toBeFocused();
  await page.keyboard.type(cliente);
  const selectCliente = alta.getByLabel("Cliente", { exact: true });
  await expect(selectCliente.getByRole("option", { name: new RegExp(cliente) })).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(selectCliente).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(selectCliente.locator("option:checked")).toHaveText(new RegExp(cliente));
  await tabHasta(page, alta.getByRole("button", { name: "Crear pedido" }));
  await page.keyboard.press("Enter");
  await expect(alta).toBeHidden();

  // El detalle del pedido nuevo recibe el foco: el siguiente Tab sigue ahi, no en la lista.
  const panel = page.getByRole("region", { name: /^Pedido PED-/ });
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.locator("xpath=..").evaluate((el) => el.contains(document.activeElement))).toBe(true);

  // Item: buscar, elegir con flechas, cantidad y Enter para guardar.
  const agregar = panel.getByRole("button", { name: "Agregar item" });
  await tabHasta(page, agregar);
  await page.keyboard.press("Enter");
  const linea = page.getByRole("dialog", { name: "Agregar item" });
  await expect(linea.getByLabel("Buscar item")).toBeFocused();
  await page.keyboard.type(producto.nombre);
  const selectItem = linea.getByLabel("Item", { exact: true });
  await expect(selectItem.getByRole("option", { name: new RegExp(producto.nombre) })).toHaveCount(1);
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  await expect(selectItem.locator("option:checked")).toHaveText(new RegExp(producto.nombre));
  await tabHasta(page, linea.getByLabel("Cantidad"));
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await expect(linea).toBeHidden();
  // Al cerrar, el foco vuelve al boton que abrio el dialogo.
  await expect(agregar).toBeFocused();
  await expect(panel.getByRole("row").filter({ hasText: producto.nombre }).first()).toBeVisible();

  // Confirmar: el dialogo muestra el impacto y se confirma con Enter.
  await tabHasta(page, panel.getByRole("button", { name: "Confirmar pedido" }));
  await page.keyboard.press("Enter");
  const confirmar = page.getByRole("dialog", { name: "Confirmar pedido" });
  await expect(confirmar).toBeVisible();
  await expect.poll(() => enfocadoDentro(confirmar)).toBe(true);
  await tabHasta(page, confirmar.getByRole("button", { name: "Confirmar y descontar stock" }));
  await page.keyboard.press("Enter");
  await expect(confirmar).toBeHidden();
  await expect(panel.getByLabel("Estado del pedido")).toHaveValue("CONFIRMADO");
  // "Confirmar pedido" ya no existe: el foco vuelve al panel del pedido, no al principio de la pagina.
  await expect.poll(() => enfocadoDentro(panel)).toBe(true);

  // Comprobante: el enlace se sigue con Enter y la hoja se imprime con Enter.
  await tabHasta(page, panel.getByRole("link", { name: "Comprobante" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/pedidos\/comprobante\?pedido=/);
  const imprimir = page.getByRole("button", { name: "Imprimir" });
  await expect(imprimir).toBeEnabled();
  await expect(page.getByText(producto.nombre)).toBeVisible();
  await tabHasta(page, imprimir);
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => (window as unknown as { impresiones: number }).impresiones)).toBe(1);
});

test("los dialogos retienen el foco, se cierran con Escape y devuelven el foco", async ({ page }) => {
  await page.goto("/pedidos");
  const nuevo = page.getByRole("button", { name: "Nuevo pedido" });
  await expect(nuevo).toBeVisible();
  await tabHasta(page, nuevo);
  await page.keyboard.press("Enter");

  const alta = page.getByRole("dialog", { name: "Nuevo pedido" });
  await expect(alta).toBeVisible();

  // Tab y Shift+Tab dan la vuelta dentro del dialogo, sin pasar a la pagina de atras.
  for (let paso = 0; paso < 25; paso += 1) {
    await page.keyboard.press("Tab");
    expect(await enfocadoDentro(alta)).toBe(true);
  }
  for (let paso = 0; paso < 25; paso += 1) {
    await page.keyboard.press("Shift+Tab");
    expect(await enfocadoDentro(alta)).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(alta).toBeHidden();
  await expect(nuevo).toBeFocused();
});
