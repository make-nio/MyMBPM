import { crearCategoria, crearItem } from "./api";
import { expect, test, unico } from "./fixtures";

test("alta de un producto y armado de su receta con un insumo", async ({ page }) => {
  const categoria = unico("PRUEBA-Cat-Items");
  const { idCategoria } = await crearCategoria(categoria);
  const insumo = await crearItem({ idCategoria, nombre: unico("PRUEBA-Insumo"), tipoItem: "INSUMO" });
  const producto = unico("PRUEBA-Producto");

  await page.goto("/items-catalogo");
  await page.getByRole("button", { name: "Nuevo item" }).click();

  const modal = page.getByRole("dialog", { name: "Nuevo item" });
  await modal.getByLabel("Categoria").selectOption({ label: categoria });
  await modal.getByLabel("Tipo de item").selectOption("PRODUCTO");
  await modal.getByLabel("Nombre").fill(producto);
  await modal.getByLabel("Slug").fill(producto.toLowerCase());
  await modal.getByLabel("Precio").fill("1500.50");
  await modal.getByRole("button", { name: "Guardar item" }).click();
  await expect(modal).toBeHidden();

  const fila = page.getByRole("row").filter({ hasText: producto });
  await expect(fila).toContainText("PRODUCTO");
  await fila.getByRole("button", { name: "Receta" }).click();
  await expect(page.getByRole("heading", { name: `Receta de ${producto}` })).toBeVisible();

  await page.getByRole("button", { name: "Nuevo componente" }).click();
  const receta = page.getByRole("dialog", { name: "Nuevo componente" });
  await receta.getByLabel("Item componente", { exact: true }).selectOption({ label: `${insumo.nombre} (INSUMO)` });
  await receta.getByLabel("Cantidad requerida").fill("1.5");
  await receta.getByLabel("Unidad de medida").fill("KG");
  await receta.getByRole("button", { name: "Guardar componente" }).click();
  await expect(receta).toBeHidden();

  // Por celda exacta: hasText no distingue mayusculas y el sufijo aleatorio del nombre puede
  // contener "kg", con lo que la fila del catalogo tambien matchearia.
  const componente = page
    .getByRole("row")
    .filter({ hasText: insumo.nombre })
    .filter({ has: page.getByRole("cell", { name: "KG", exact: true }) });
  await expect(componente).toContainText("1.5");

  page.once("dialog", (dialogo) => void dialogo.accept());
  await componente.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText("Receta vacia")).toBeVisible();
});
