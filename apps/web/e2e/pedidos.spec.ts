import type { Page } from "@playwright/test";

import { revisarAccesibilidad } from "./accesibilidad";
import { api, crearCliente, crearProductoConStock } from "./api";
import { ADMIN_E2E } from "./entorno";
import { expect, test, unico } from "./fixtures";

async function nuevoPedido(page: Page, cliente: string) {
  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Nuevo pedido" }).click();

  const modal = page.getByRole("dialog", { name: "Nuevo pedido" });
  await modal.getByLabel("Cliente", { exact: true }).selectOption({ label: cliente });
  await modal.getByLabel("Origen").selectOption("INSTAGRAM");
  await modal.getByRole("button", { name: "Crear pedido" }).click();
  await expect(modal).toBeHidden();

  const panel = page.getByRole("region", { name: /^Pedido PED-/ });
  await expect(panel).toBeVisible();
  return panel;
}

async function agregarLinea(page: Page, producto: string, cantidad: string) {
  await page.getByRole("button", { name: "Agregar item" }).click();
  const modal = page.getByRole("dialog", { name: "Agregar item" });
  // La opcion muestra "nombre ($ precio)"; se elige por el value de la que empieza con el nombre.
  const opcion = modal.getByRole("option", { name: new RegExp(`^${producto} `) });
  await modal.getByLabel("Item", { exact: true }).selectOption((await opcion.getAttribute("value")) ?? "");
  await modal.getByLabel("Cantidad").fill(cantidad);
  await modal.getByRole("button", { name: "Guardar item" }).click();
  await expect(modal).toBeHidden();
}

test("pedido completo: items, impacto en stock, confirmacion y seguimiento", async ({ page }) => {
  const cliente = unico("PRUEBA-ClientePed");
  await crearCliente(cliente);
  const vela = await crearProductoConStock(unico("PRUEBA-Vela"), 1000.5, 5);
  const maceta = await crearProductoConStock(unico("PRUEBA-Maceta"), 250, 10);
  await page.reload();

  const panel = await nuevoPedido(page, cliente);
  await expect(panel.getByText("Pedido sin items")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Confirmar pedido" })).toBeDisabled();
  // Un pedido pendiente solo se confirma (descuenta stock) o se cancela: no pasa a preparacion.
  await expect(panel.getByLabel("Estado del pedido").locator("option")).toHaveText(["Pendiente", "Cancelado"]);

  await agregarLinea(page, vela.nombre, "3");
  await panel.getByRole("row").filter({ hasText: vela.nombre }).first().getByRole("button", { name: "Editar" }).click();
  await page.getByRole("dialog", { name: "Editar item" }).getByLabel("Cantidad").fill("2");
  await page.getByRole("dialog", { name: "Editar item" }).getByRole("button", { name: "Guardar item" }).click();
  await agregarLinea(page, maceta.nombre, "1.5");

  // 2 x 1000,50 + 1,5 x 250 = 2376,00
  await expect(panel.getByTestId("total-pedido")).toHaveText(/2\.376,00/);

  const impacto = panel.getByRole("region", { name: "Impacto en stock al confirmar" });
  await expect(impacto.getByRole("row").filter({ hasText: vela.nombre })).toContainText(/5\s*-2\s*3/);
  await expect(impacto.getByRole("row").filter({ hasText: maceta.nombre })).toContainText(/10\s*-1,5\s*8,5/);

  await panel.getByRole("button", { name: "Confirmar pedido" }).click();
  const confirmacion = page.getByRole("dialog", { name: "Confirmar pedido" });
  await expect(confirmacion).toContainText("se descuenta el stock");
  await confirmacion.getByRole("button", { name: "Confirmar y descontar stock" }).click();
  await expect(confirmacion).toBeHidden();

  await expect(panel.getByTestId("estado-pedido")).toHaveText("Confirmado");
  await expect(panel.getByRole("button", { name: "Agregar item" })).toHaveCount(0);

  const movimientos = panel.getByRole("region", { name: "Movimientos de stock del pedido" });
  const movimientoVela = movimientos.getByRole("row").filter({ hasText: vela.nombre });
  await expect(movimientoVela).toContainText(/5\s*-2\s*3/);
  // La confirmacion queda a nombre del usuario de la sesion.
  await expect(movimientoVela).toContainText(`${ADMIN_E2E.nombre} ${ADMIN_E2E.apellido}`);
  await expect(movimientos.getByRole("row").filter({ hasText: maceta.nombre })).toContainText(/10\s*-1,5\s*8,5/);

  await panel.getByLabel("Estado del pedido").selectOption("EN_PREPARACION");
  await panel.getByLabel("Cobro").selectOption("SEÑADO");
  await panel.getByRole("button", { name: "Guardar estado" }).click();
  await expect(panel.getByTestId("estado-pedido")).toHaveText("En preparacion");

  const numero = (await panel.getByRole("heading").textContent()) ?? "";
  const fila = page.getByRole("row").filter({ hasText: numero });
  await expect(fila).toContainText("En preparacion");
  await expect(fila).toContainText("Señado");

  await panel.getByLabel("Estado del pedido").selectOption("CANCELADO");
  await expect(panel.getByText("no devuelve el stock descontado")).toBeVisible();
  await panel.getByRole("button", { name: "Guardar estado" }).click();
  await expect(panel.getByTestId("estado-pedido")).toHaveText("Cancelado");
  // Cancelado es final.
  await expect(panel.getByLabel("Estado del pedido")).toBeDisabled();
});

test("con stock insuficiente avisa y no deja confirmar", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteSin");
  await crearCliente(cliente);
  const figura = await crearProductoConStock(unico("PRUEBA-Figura"), 500, 1);
  await page.goto("/pedidos");

  const panel = await nuevoPedido(page, cliente);
  await agregarLinea(page, figura.nombre, "2");

  const impacto = panel.getByRole("region", { name: "Impacto en stock al confirmar" });
  await expect(impacto).toContainText("(insuficiente)");
  await expect(impacto.getByText(/No hay stock suficiente/)).toBeVisible();

  await panel.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(
    page.getByRole("dialog", { name: "Confirmar pedido" }).getByRole("button", { name: "Confirmar y descontar stock" })
  ).toBeDisabled();
  await page.getByRole("dialog", { name: "Confirmar pedido" }).getByRole("button", { name: "Cancelar" }).click();

  await panel.getByRole("row").filter({ hasText: figura.nombre }).first().getByRole("button", { name: "Quitar" }).click();
  await expect(panel.getByText("Pedido sin items")).toBeVisible();
});

test("filtra el listado por estado", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteFil");
  await crearCliente(cliente);
  await page.goto("/pedidos");
  await nuevoPedido(page, cliente);

  await page.getByLabel("Filtrar por estado").selectOption("ENTREGADO");
  await expect(page.getByRole("row").filter({ hasText: cliente })).toHaveCount(0);

  await page.getByLabel("Filtrar por estado").selectOption("PENDIENTE");
  await expect(page.getByRole("row").filter({ hasText: cliente }).first()).toBeVisible();
});

test("repetir un pedido: vista previa con precios de hoy y el nuevo se crea solo al confirmar", async ({ page }) => {
  const nombreCliente = unico("PRUEBA-ClienteRepetir");
  const cliente = await crearCliente(nombreCliente);
  const maceta = await crearProductoConStock(unico("PRUEBA-MacetaRep"), 1000, 10);
  const vela = await crearProductoConStock(unico("PRUEBA-VelaRep"), 500, 10);
  const llavero = await crearProductoConStock(unico("PRUEBA-LlaveroRep"), 100, 10);
  const original = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "INSTAGRAM"
  });
  for (const [item, cantidad] of [[maceta, 2], [vela, 1], [llavero, 3]] as const) {
    await api("POST", `/api/pedidos/${original.idPedido}/detalles`, { idItemCatalogo: item.idItemCatalogo, cantidad });
  }
  await api("POST", `/api/pedidos/${original.idPedido}/confirmar`);

  // Despues del pedido, la maceta sube de precio y el llavero se da de baja.
  await api("PATCH", `/api/items-catalogo/${maceta.idItemCatalogo}`, { precio: 1200 });
  await api("PATCH", `/api/items-catalogo/${llavero.idItemCatalogo}/estado`, { activo: false });
  const pedidosDelCliente = async () =>
    (await api<Array<{ idPedido: string }>>("GET", `/api/pedidos?idCliente=${cliente.idCliente}`)).length;

  await page.goto(`/pedidos?pedido=${original.idPedido}`);
  const panel = page.getByRole("region", { name: `Pedido ${original.numeroPedido}` });
  await panel.getByRole("button", { name: "Repetir" }).click();
  const dialogo = page.getByRole("dialog", { name: "Repetir pedido" });
  await expect(dialogo).toContainText(`Cliente: ${nombreCliente}`);
  await expect(dialogo.getByRole("row").filter({ hasText: maceta.nombre })).toContainText(/1\.000,00.*1\.200,00.*2\.400,00/);
  await expect(dialogo.getByRole("row").filter({ hasText: llavero.nombre })).toContainText("No se repite: El item esta inactivo");
  await expect(dialogo.getByTestId("total-repeticion")).toHaveText(/2\.900,00/);
  await revisarAccesibilidad(page, "repetir pedido");

  // Cancelar no crea nada.
  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();
  expect(await pedidosDelCliente()).toBe(1);

  await panel.getByRole("button", { name: "Repetir" }).click();
  await dialogo.getByRole("button", { name: "Crear pedido nuevo" }).click();
  await expect(dialogo).toBeHidden();
  expect(await pedidosDelCliente()).toBe(2);

  // Queda abierto el pedido nuevo: pendiente, con las dos lineas disponibles a precio de hoy.
  const nuevo = page.getByRole("region", { name: /^Pedido PED-/ });
  await expect(nuevo).not.toHaveAttribute("aria-label", `Pedido ${original.numeroPedido}`);
  await expect(nuevo.getByTestId("estado-pedido")).toHaveText("Pendiente");
  await expect(nuevo.getByTestId("total-pedido")).toHaveText(/2\.900,00/);
  await expect(nuevo.getByRole("row").filter({ hasText: llavero.nombre })).toHaveCount(0);
});
