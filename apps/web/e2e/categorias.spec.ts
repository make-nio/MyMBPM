import { expect, test, unico } from "./fixtures";

test("alta, edicion y desactivacion de una categoria", async ({ page }) => {
  const nombre = unico("PRUEBA-Categoria");
  const slug = nombre.toLowerCase();

  await page.goto("/categorias");
  await page.getByRole("button", { name: "Nueva categoria" }).click();

  const modal = page.getByRole("dialog", { name: "Nueva categoria" });
  await modal.getByLabel("Nombre").fill(nombre);
  await modal.getByLabel("Slug").fill(slug);
  await modal.getByLabel("Descripcion").fill("Creada por Playwright");
  await modal.getByRole("button", { name: "Guardar categoria" }).click();
  await expect(modal).toBeHidden();

  const fila = page.getByRole("row").filter({ hasText: slug });
  await expect(fila).toContainText("Activa");

  await fila.getByRole("button", { name: "Editar" }).click();
  const edicion = page.getByRole("dialog", { name: "Editar categoria" });
  await edicion.getByLabel("Descripcion").fill("Editada por Playwright");
  await edicion.getByRole("button", { name: "Guardar categoria" }).click();
  await expect(fila).toContainText("Editada por Playwright");

  await fila.getByRole("button", { name: "Desactivar" }).click();
  await expect(fila).toContainText("Inactiva");

  await page.locator("select.control-filtro").selectOption("activos");
  await expect(page.getByRole("row").filter({ hasText: slug })).toHaveCount(0);
});

test("muestra el error de la API si el slug ya existe", async ({ page }) => {
  const slug = unico("prueba-slug");

  for (const intento of [1, 2]) {
    await page.goto("/categorias");
    await page.getByRole("button", { name: "Nueva categoria" }).click();
    const modal = page.getByRole("dialog", { name: "Nueva categoria" });
    await modal.getByLabel("Nombre").fill(`PRUEBA ${intento}`);
    await modal.getByLabel("Slug").fill(slug);
    await modal.getByRole("button", { name: "Guardar categoria" }).click();

    if (intento === 2) {
      await expect(modal.getByLabel("Slug")).toHaveAccessibleDescription(/Ya existe otro registro con ese slug/);
    }
  }
});
