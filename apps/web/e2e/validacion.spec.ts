import type { Locator, Page } from "@playwright/test";

import { revisarAccesibilidad } from "./accesibilidad";
import { ajustarStock, crearCategoria, crearCliente, crearItem, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

// Un formulario con datos mal cargados no llega a la API: marca cada campo con su mensaje (que
// dice que esta mal y como se arregla), lo asocia al control para el lector de pantalla
// (aria-invalid + aria-describedby), anuncia el resumen (role=alert) y lleva el foco al primero.
async function esperarErrorEnCampo(campo: Locator, mensaje: string | RegExp) {
  await expect(campo).toHaveAttribute("aria-invalid", "true");
  await expect(campo).toHaveAccessibleDescription(mensaje);
}

async function esperarResumen(contenedor: Locator | Page, cantidad: number) {
  const texto = cantidad === 1 ? "Hay un dato para corregir" : `Hay ${cantidad} datos para corregir`;
  // Filtra por texto: Next agrega su propio role=alert (el anunciador de rutas), vacio.
  await expect(contenedor.getByRole("alert").filter({ hasText: texto })).toBeVisible();
}

test.describe("sin sesion", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ingreso: pide usuario y avisa si la clave es demasiado corta", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByLabel("Clave").fill("123");
    await page.getByRole("button", { name: /ingresar/i }).click();

    await esperarResumen(page, 2);
    const usuario = page.getByLabel("Usuario o email");
    await esperarErrorEnCampo(usuario, "Falta el usuario o el email: completalo para poder guardar.");
    await expect(usuario).toBeFocused();
    await esperarErrorEnCampo(page.getByLabel("Clave"), /al menos 8 caracteres: revisa que la escribiste completa/);

    // Al corregir el campo su mensaje se va.
    await usuario.fill("maxi");
    await expect(usuario).not.toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/ingresar$/);
  });
});

test("categoria: campos obligatorios y slug repetido junto al campo", async ({ page }) => {
  await page.goto("/categorias");
  await page.getByRole("button", { name: "Nueva categoria" }).click();
  const modal = page.getByRole("dialog", { name: "Nueva categoria" });
  await modal.getByRole("button", { name: "Guardar categoria" }).click();

  await esperarResumen(modal, 2);
  await esperarErrorEnCampo(modal.getByLabel("Nombre"), "Falta el nombre: completalo para poder guardar.");
  await expect(modal.getByLabel("Nombre")).toBeFocused();
  await esperarErrorEnCampo(modal.getByLabel("Slug"), /Falta el slug/);
  await revisarAccesibilidad(page, "alta de categoria con errores de validacion");

  // El duplicado lo detecta la API y se muestra en el campo que hay que cambiar.
  const existente = unico("PRUEBA-CatDup");
  await crearCategoria(existente);
  await modal.getByLabel("Nombre").fill("PRUEBA duplicada");
  await modal.getByLabel("Slug").fill(existente.toLowerCase());
  await modal.getByRole("button", { name: "Guardar categoria" }).click();
  await esperarErrorEnCampo(modal.getByLabel("Slug"), "Ya existe otro registro con ese slug: elegi uno distinto y volve a guardar");
  await expect(modal.getByLabel("Slug")).toBeFocused();
});

test("cliente: nombre obligatorio y email con formato", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo cliente" });
  await modal.getByLabel("Email").fill("maxi-sin-arroba");
  await modal.getByRole("button", { name: "Guardar cliente" }).click();

  await esperarResumen(modal, 2);
  await esperarErrorEnCampo(modal.getByLabel("Nombre"), "Falta el nombre: completalo para poder guardar.");
  await esperarErrorEnCampo(modal.getByLabel("Email"), /tiene que tener la forma nombre@dominio.com/);
});

test("usuario: clave inicial corta y email repetido junto al campo", async ({ page }) => {
  await page.goto("/usuarios");
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo usuario" });
  await modal.getByLabel("Nombre").fill("Maxi");
  await modal.getByLabel("Apellido").fill("PRUEBA");
  await modal.getByLabel("Email").fill("maxi@mymbpm.test");
  await modal.getByLabel("Usuario", { exact: true }).fill(unico("prueba-val"));
  await modal.getByLabel("Clave inicial").fill("corta");
  await modal.getByRole("button", { name: "Guardar usuario" }).click();

  await esperarResumen(modal, 1);
  await esperarErrorEnCampo(modal.getByLabel("Clave inicial"), /al menos 8 caracteres \(tiene 5\)/);
  await expect(modal.getByLabel("Clave inicial")).toBeFocused();
});

test("restablecer clave: la repeticion tiene que coincidir", async ({ page }) => {
  const usuario = unico("prueba-valclave").toLowerCase();
  await page.goto("/usuarios");
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  const alta = page.getByRole("dialog", { name: "Nuevo usuario" });
  await alta.getByLabel("Nombre").fill("Maxi");
  await alta.getByLabel("Apellido").fill("PRUEBA");
  await alta.getByLabel("Email").fill(`${usuario}@mymbpm.test`);
  await alta.getByLabel("Usuario", { exact: true }).fill(usuario);
  await alta.getByLabel("Clave inicial").fill("clave-inicial-1");
  await alta.getByRole("button", { name: "Guardar usuario" }).click();
  await expect(alta).toBeHidden();

  await page.getByRole("row").filter({ hasText: `${usuario}@mymbpm.test` }).getByRole("button", { name: "Restablecer clave" }).click();
  const modal = page.getByRole("dialog", { name: "Restablecer clave" });
  await modal.getByLabel("Clave nueva", { exact: true }).fill("clave-nueva-123");
  await modal.getByLabel("Repetir clave nueva").fill("otra-clave-999");
  await modal.getByRole("button", { name: "Restablecer clave" }).click();

  await esperarResumen(modal, 1);
  await esperarErrorEnCampo(modal.getByLabel("Repetir clave nueva"), "No coincide con la clave nueva: escribila de nuevo igual.");
});

test("item del catalogo: precio negativo, stock minimo con decimales y receta sin componente", async ({ page }) => {
  const categoria = unico("PRUEBA-CatVal");
  const { idCategoria } = await crearCategoria(categoria);

  await page.goto("/items-catalogo");
  await page.getByRole("button", { name: "Nuevo item" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo item" });
  await modal.getByLabel("Categoria").selectOption({ label: categoria });
  await modal.getByLabel("Nombre").fill("PRUEBA item");
  await modal.getByLabel("Slug").fill(unico("prueba-item-val"));
  await modal.getByLabel("Precio").fill("-10");
  await modal.getByLabel("Stock minimo").fill("2.5");
  await modal.getByRole("button", { name: "Guardar item" }).click();

  await esperarResumen(modal, 2);
  await esperarErrorEnCampo(modal.getByLabel("Precio"), "No puede ser negativo: escribi 0 o un numero mayor.");
  await expect(modal.getByLabel("Precio")).toBeFocused();
  await esperarErrorEnCampo(modal.getByLabel("Stock minimo"), "Tiene que ser un numero entero, sin decimales.");
  await modal.getByRole("button", { name: "Cancelar" }).click();

  const producto = await crearItem({ idCategoria, nombre: unico("PRUEBA-ProdVal"), tipoItem: "PRODUCTO", precio: 100 });
  await page.getByLabel("Buscar item").fill(producto.nombre);
  await page.getByLabel("Buscar item").press("Enter");
  await page.getByRole("row").filter({ hasText: producto.nombre }).getByRole("button", { name: "Receta" }).click();
  await page.getByRole("button", { name: "Nuevo componente" }).click();
  const receta = page.getByRole("dialog", { name: "Nuevo componente" });
  await receta.getByLabel("Cantidad requerida").fill("0");
  await receta.getByRole("button", { name: "Guardar componente" }).click();

  await esperarResumen(receta, 2);
  await esperarErrorEnCampo(receta.getByLabel("Item componente", { exact: true }), /Falta el item componente: buscalo y elegilo/);
  await esperarErrorEnCampo(receta.getByLabel("Cantidad requerida"), "Tiene que ser mayor a cero: escribi una cantidad positiva.");
});

test("pedido: cliente obligatorio y cantidad de la linea mayor a cero", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteVal");
  await crearCliente(cliente);
  const producto = await crearProductoConStock(unico("PRUEBA-ProdPedVal"), 100, 5);

  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Nuevo pedido" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo pedido" });
  await modal.getByRole("button", { name: "Crear pedido" }).click();

  await esperarResumen(modal, 1);
  const selectCliente = modal.getByLabel("Cliente", { exact: true });
  await esperarErrorEnCampo(selectCliente, /Falta el cliente: buscalo y elegilo de la lista/);
  await expect(selectCliente).toBeFocused();

  await modal.getByLabel("Buscar cliente").fill(cliente);
  await selectCliente.selectOption({ label: cliente });
  await modal.getByRole("button", { name: "Crear pedido" }).click();
  await expect(modal).toBeHidden();

  const panel = page.getByRole("region", { name: /^Pedido PED-/ });
  await panel.getByRole("button", { name: "Agregar item" }).click();
  const linea = page.getByRole("dialog", { name: "Agregar item" });
  await linea.getByLabel("Buscar item").fill(producto.nombre);
  const opcion = linea.getByRole("option", { name: new RegExp(`^${producto.nombre} `) });
  await linea.getByLabel("Item", { exact: true }).selectOption((await opcion.getAttribute("value")) ?? "");
  await linea.getByLabel("Cantidad").fill("0");
  await linea.getByRole("button", { name: "Guardar item" }).click();

  await esperarResumen(linea, 1);
  await esperarErrorEnCampo(linea.getByLabel("Cantidad"), "Tiene que ser mayor a cero: escribi una cantidad positiva.");
});

test("produccion: producto obligatorio en el detalle de la orden", async ({ page }) => {
  await page.goto("/produccion");
  await page.getByRole("button", { name: "Nueva orden" }).click();
  const alta = page.getByRole("dialog", { name: "Nueva orden" });
  await alta.getByLabel("Observaciones").fill("PRUEBA validacion");
  await alta.getByRole("button", { name: "Crear orden" }).click();
  await expect(alta).toBeHidden();

  await page.getByRole("button", { name: "Agregar producto" }).click();
  const modal = page.getByRole("dialog", { name: "Agregar producto" });
  await modal.getByLabel("Cantidad").fill("");
  await modal.getByRole("button", { name: "Guardar producto" }).click();

  await esperarResumen(modal, 2);
  await esperarErrorEnCampo(modal.getByLabel("Producto a fabricar", { exact: true }), /Falta el producto a fabricar/);
  await esperarErrorEnCampo(modal.getByLabel("Cantidad"), "Falta la cantidad: completalo para poder guardar.");
});

test("stock: el ajuste pide el motivo", async ({ page }) => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatAjVal"));
  const insumo = await crearItem({ idCategoria, nombre: unico("PRUEBA-InsAjVal"), tipoItem: "INSUMO" });
  await ajustarStock(insumo.idItemCatalogo, 3, "INSUMO");

  await page.goto("/stock");
  await page.getByLabel("Buscar item").fill(insumo.nombre);
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: insumo.nombre, exact: true }) })
    .getByRole("button", { name: "Ajustar" })
    .click();
  const modal = page.getByRole("dialog", { name: "Ajustar stock" });
  await modal.getByLabel("Cantidad").fill("1");
  await modal.getByRole("button", { name: "Registrar ajuste" }).click();

  await esperarResumen(modal, 1);
  await esperarErrorEnCampo(modal.getByLabel("Motivo"), /Falta el motivo del ajuste/);
  await expect(modal.getByLabel("Motivo")).toBeFocused();
});

test("solicitud especial: nombre y descripcion obligatorios", async ({ page }) => {
  await page.goto("/solicitudes-especiales");
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  const modal = page.getByRole("dialog", { name: "Nueva solicitud" });
  await modal.getByRole("button", { name: /Guardar/ }).click();

  await esperarResumen(modal, 2);
  await esperarErrorEnCampo(modal.getByLabel("Nombre solicitante"), /Falta el nombre de quien lo pide/);
  await esperarErrorEnCampo(modal.getByLabel("Descripcion"), /Falta la descripcion de lo que pide/);
});
