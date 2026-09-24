import { api, crearCategoria, crearCliente, crearItem } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

test("editar el precio de un item queda en su historial, con el usuario", async ({ page }) => {
  const categoria = await crearCategoria(unico("PRUEBA-CatHist"));
  const item = await crearItem({ idCategoria: categoria.idCategoria, nombre: unico("PRUEBA-ItemHist"), tipoItem: "PRODUCTO", precio: 100 });

  await page.goto("/items-catalogo");
  await page.getByLabel("Buscar item").fill(item.nombre);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const fila = page.getByRole("row").filter({ hasText: item.nombre });

  await fila.getByRole("button", { name: "Editar" }).click();
  const modal = page.getByRole("dialog", { name: "Editar item" });
  await modal.getByLabel("Precio").fill("120");
  await modal.getByLabel("Stock minimo").fill("4");
  await modal.getByRole("button", { name: "Guardar item" }).click();
  await expect(modal).toBeHidden();

  await fila.getByRole("button", { name: "Receta" }).click();
  const historial = page.getByRole("region", { name: "Historial de cambios" });
  const modificacion = historial.getByRole("listitem").filter({ hasText: "Modificacion" }).first();
  await expect(modificacion).toContainText("Admin E2E");
  await expect(modificacion).toContainText(/Precio: \$\s100,00 → \$\s120,00/);
  await expect(modificacion).toContainText("Stock minimo: 0 → 4");
  // Guardar el formulario no registra como cambio los campos que no se tocaron.
  await expect(modificacion).not.toContainText("Codigo");
  await expect(historial.getByRole("listitem").filter({ hasText: "Alta" }).first()).toContainText("Precio: $");
});

test("desactivar un cliente queda en su historial", async ({ page }) => {
  const nombre = unico("PRUEBA-ClienteHist");
  await crearCliente(nombre);

  await page.goto("/clientes");
  await page.getByPlaceholder("Buscar por nombre, telefono, email o documento").fill(nombre);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const fila = page.getByRole("row").filter({ hasText: nombre });
  await fila.getByRole("button", { name: "Desactivar" }).click();
  await expect(fila.getByRole("button", { name: "Activar" })).toBeVisible();

  await fila.getByRole("button", { name: "Historial" }).click();
  const modal = page.getByRole("dialog", { name: `Historial de ${nombre}` });
  await expect(modal.getByRole("listitem").filter({ hasText: "Desactivacion" }).first()).toContainText("Activo: Si → No");
});

test("un operador no ve el historial ni lo puede pedir a la API", async ({ browser }) => {
  const usuario = unico("prueba-operador-hist").toLowerCase();
  await api("POST", "/api/usuarios", {
    nombre: "Operador",
    apellido: "PRUEBA",
    email: `${usuario}@mymbpm.test`,
    usuario,
    password: "clave-operador-1"
  });
  const cliente = await crearCliente(unico("PRUEBA-ClienteOculto"));

  const login = await fetch(`${URL_WEB}/api/autenticacion/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identificador: usuario, password: "clave-operador-1" })
  });
  const token = ((await login.json()) as { data: { token: string } }).data.token;

  await expect(api("GET", `/api/auditoria?entidad=CLIENTE&idEntidad=${cliente.idCliente}`, undefined, token)).rejects.toThrow(/403/);

  const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await page.goto("/ingresar");
  await page.getByLabel("Usuario o email").fill(usuario);
  await page.getByLabel("Clave").fill("clave-operador-1");
  await page.getByRole("button", { name: /ingresar/i }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/clientes");
  await expect(page.getByRole("row").nth(1)).toBeVisible();
  await expect(page.getByRole("button", { name: "Historial" })).toHaveCount(0);
  await page.close();
});
