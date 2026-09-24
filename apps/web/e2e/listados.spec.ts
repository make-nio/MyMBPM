import { crearCategoria, crearCliente, crearItem } from "./api";
import { expect, test, unico } from "./fixtures";

// La API devuelve como mucho 100 filas por pedido: las tablas cargan de a 50 con "Cargar mas" y
// los selectores buscan en el servidor. Aca se siembran mas filas que eso.

test("mas de 100 clientes: se cargan de a 50 y el aviso desaparece al llegar al final", async ({ page }) => {
  test.setTimeout(60_000);
  const lote = unico("PRUEBA-Lote");
  // En serie para que el orden de alta (y por lo tanto el de la tabla) sea el del numero.
  for (let numero = 1; numero <= 120; numero++) {
    await crearCliente(`${lote}-${String(numero).padStart(3, "0")}`);
  }

  await page.goto("/clientes");
  await page.getByPlaceholder("Buscar por nombre, telefono, email o documento").fill(lote);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();

  const filas = page.getByRole("row").filter({ hasText: lote });
  const aviso = page.getByRole("status").filter({ hasText: "Hay mas resultados" });
  await expect(filas).toHaveCount(50);
  await expect(aviso).toContainText("Se muestran los primeros 50");

  await aviso.getByRole("button", { name: "Cargar mas" }).click();
  await expect(filas).toHaveCount(100);

  await page.getByRole("button", { name: "Cargar mas" }).click();
  await expect(filas).toHaveCount(120);
  await expect(aviso).toHaveCount(0);
  // El mas viejo llega al final, sin repetidos ni saltos entre paginas.
  await expect(filas.last()).toContainText(`${lote}-001`);

  // Editar un cliente de la ultima pagina no vuelve a la primera.
  await filas.last().getByRole("button", { name: "Desactivar" }).click();
  await expect(filas.last().getByRole("button", { name: "Activar" })).toBeVisible();
  await expect(filas).toHaveCount(120);

  // En el alta de un pedido, el cliente mas viejo del lote se encuentra buscandolo.
  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Nuevo pedido" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo pedido" });
  const cliente = modal.getByLabel("Cliente", { exact: true });
  await expect(cliente.getByRole("option", { name: `${lote}-002` })).toHaveCount(0);
  await expect(modal.getByText("Se muestran los primeros 20")).toBeVisible();

  await modal.getByLabel("Buscar cliente").fill(`${lote}-002`);
  await cliente.selectOption({ label: `${lote}-002` });
  await modal.getByRole("button", { name: "Crear pedido" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByRole("region", { name: /^Pedido PED-/ })).toContainText(`${lote}-002`);
});

test("el selector de productos encuentra uno que no esta entre los 20 mas recientes", async ({ page }) => {
  test.setTimeout(60_000);
  const categoria = await crearCategoria(unico("PRUEBA-CatLote"));
  const buscado = await crearItem({
    idCategoria: categoria.idCategoria,
    nombre: unico("PRUEBA-Buscado"),
    tipoItem: "PRODUCTO",
    precio: 10
  });
  for (let numero = 1; numero <= 25; numero++) {
    await crearItem({ idCategoria: categoria.idCategoria, nombre: unico(`PRUEBA-Relleno${numero}`), tipoItem: "PRODUCTO" });
  }
  const clienteNombre = unico("PRUEBA-ClienteLote");
  await crearCliente(clienteNombre);

  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Nuevo pedido" }).click();
  const alta = page.getByRole("dialog", { name: "Nuevo pedido" });
  await alta.getByLabel("Buscar cliente").fill(clienteNombre);
  await alta.getByLabel("Cliente", { exact: true }).selectOption({ label: clienteNombre });
  await alta.getByRole("button", { name: "Crear pedido" }).click();

  const panel = page.getByRole("region", { name: /^Pedido PED-/ });
  await panel.getByRole("button", { name: "Agregar item" }).click();
  const linea = page.getByRole("dialog", { name: "Agregar item" });
  const opcion = linea.getByRole("option", { name: new RegExp(`^${buscado.nombre} `) });
  await expect(opcion).toHaveCount(0);

  await linea.getByLabel("Buscar item").fill(buscado.nombre);
  await expect(opcion).toHaveCount(1);
  await linea.getByLabel("Item", { exact: true }).selectOption((await opcion.getAttribute("value")) ?? "");
  await linea.getByLabel("Cantidad").fill("1");
  await linea.getByRole("button", { name: "Guardar item" }).click();
  await expect(linea).toBeHidden();
  await expect(panel.getByTestId("total-pedido")).toHaveText(/10,00/);
});
