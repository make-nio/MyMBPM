import { expect, test, unico } from "./fixtures";

test("alta, busqueda sin distinguir mayusculas, edicion y desactivacion de un cliente", async ({ page }) => {
  const nombre = unico("PRUEBA-Cliente");

  await page.goto("/clientes");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();

  const modal = page.getByRole("dialog");
  await modal.getByLabel("Nombre").fill(nombre);
  await modal.getByLabel("Apellido").fill("Núñez");
  await modal.getByLabel("Telefono").fill("1122334455");
  await modal.getByLabel("Email").fill(`${nombre.toLowerCase()}@mymbpm.test`);
  await modal.getByRole("button", { name: /guardar/i }).click();
  await expect(modal).toBeHidden();

  await page.getByPlaceholder(/buscar por nombre/i).fill(nombre.toUpperCase());
  await page.getByRole("button", { name: "Buscar", exact: true }).click();

  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila).toHaveCount(1);

  await fila.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("dialog").getByLabel("Telefono").fill("5544332211");
  await page.getByRole("dialog").getByRole("button", { name: /guardar/i }).click();
  await expect(fila).toContainText("5544332211");

  await fila.getByRole("button", { name: "Desactivar" }).click();
  await expect(fila.getByRole("button", { name: "Activar" })).toBeVisible();
});
