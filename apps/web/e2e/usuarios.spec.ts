import type { Browser, Page } from "@playwright/test";

import { ADMIN_E2E } from "./entorno";
import { expect, test, unico } from "./fixtures";

const SIN_SESION = { cookies: [], origins: [] };

async function ingresar(browser: Browser, identificador: string, password: string) {
  const page = await browser.newPage({ storageState: SIN_SESION });
  await page.goto("/ingresar");
  await page.getByLabel("Usuario o email").fill(identificador);
  await page.getByLabel("Clave").fill(password);
  await page.getByRole("button", { name: /ingresar/i }).click();
  return page;
}

async function crearOperador(page: Page, usuario: string, password = "clave-inicial-1") {
  await page.goto("/usuarios");
  await page.getByRole("button", { name: "Nuevo usuario" }).click();

  const modal = page.getByRole("dialog", { name: "Nuevo usuario" });
  await modal.getByLabel("Nombre").fill("Maxi");
  await modal.getByLabel("Apellido").fill("PRUEBA");
  await modal.getByLabel("Email").fill(`${usuario}@mymbpm.test`);
  await modal.getByLabel("Usuario", { exact: true }).fill(usuario);
  await modal.getByLabel("Clave inicial").fill(password);
  await modal.getByRole("button", { name: "Guardar usuario" }).click();
  await expect(modal).toBeHidden();

  return page.getByRole("row").filter({ hasText: `${usuario}@mymbpm.test` });
}

test("el administrador ve Usuarios en el menu y su propia fila no se puede desactivar", async ({ page }) => {
  await page.goto("/panel");
  await page.getByRole("link", { name: "Usuarios" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);

  // La tabla carga de a 50 y el administrador E2E es el usuario mas viejo: puede estar mas abajo.
  const propia = page.getByRole("row").filter({ hasText: ADMIN_E2E.email });
  const cargarMas = page.getByRole("button", { name: "Cargar mas" });
  await expect(page.getByRole("row").nth(1)).toBeVisible();
  while ((await propia.count()) === 0 && (await cargarMas.count()) > 0) {
    await cargarMas.click();
    await expect(cargarMas.or(propia).first()).toBeVisible();
  }
  await expect(propia).toContainText("(vos)");
  await expect(propia).toContainText("Administrador");
  await expect(propia.getByRole("button", { name: "Desactivar" })).toHaveCount(0);
});

test("alta de un operador, cambio de rol y desactivacion", async ({ page, browser }) => {
  const usuario = unico("prueba-op").toLowerCase();
  const fila = await crearOperador(page, usuario);
  await expect(fila).toContainText("Operador");
  await expect(fila).toContainText("Activo");

  await fila.getByRole("button", { name: "Editar" }).click();
  const edicion = page.getByRole("dialog", { name: "Editar usuario" });
  await expect(edicion.getByLabel("Clave inicial")).toHaveCount(0);
  await edicion.getByLabel(/Administrador/).check();
  await edicion.getByRole("button", { name: "Guardar usuario" }).click();
  await expect(fila).toContainText("Administrador");

  await fila.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("dialog", { name: "Editar usuario" }).getByLabel(/Administrador/).uncheck();
  await page.getByRole("dialog", { name: "Editar usuario" }).getByRole("button", { name: "Guardar usuario" }).click();
  await expect(fila).toContainText("Operador");

  await fila.getByRole("button", { name: "Desactivar" }).click();
  await expect(fila).toContainText("Inactivo");

  const intento = await ingresar(browser, usuario, "clave-inicial-1");
  await expect(intento.locator(".mensaje-error")).toBeVisible();
  await intento.close();

  await fila.getByRole("button", { name: "Activar" }).click();
  await expect(fila).toContainText("Activo");
});

test("restablecer clave: la persona ingresa con la nueva y, como operador, no gestiona usuarios", async ({
  page,
  browser
}) => {
  const usuario = unico("prueba-clave").toLowerCase();
  const fila = await crearOperador(page, usuario);

  await fila.getByRole("button", { name: "Restablecer clave" }).click();
  const modal = page.getByRole("dialog", { name: "Restablecer clave" });
  await modal.getByLabel("Clave nueva", { exact: true }).fill("clave-nueva-123");
  await modal.getByLabel("Repetir clave nueva").fill("otra-clave-999");
  await modal.getByRole("button", { name: "Restablecer clave" }).click();
  await expect(modal.getByText("Las claves no coinciden")).toBeVisible();

  await modal.getByLabel("Repetir clave nueva").fill("clave-nueva-123");
  await modal.getByRole("button", { name: "Restablecer clave" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Clave restablecida" })).toContainText(
    `Clave restablecida para ${usuario}`
  );

  const conClaveVieja = await ingresar(browser, usuario, "clave-inicial-1");
  await expect(conClaveVieja.locator(".mensaje-error")).toBeVisible();
  await conClaveVieja.close();

  const operador = await ingresar(browser, usuario, "clave-nueva-123");
  await expect(operador).toHaveURL(/\/panel$/);
  await expect(operador.getByRole("link", { name: "Usuarios" })).toHaveCount(0);

  await operador.goto("/usuarios");
  await expect(operador.getByText("Sin acceso")).toBeVisible();
  await operador.close();
});

test("muestra el error de la API si el email ya existe", async ({ page }) => {
  await page.goto("/usuarios");
  await page.getByRole("button", { name: "Nuevo usuario" }).click();

  const modal = page.getByRole("dialog", { name: "Nuevo usuario" });
  await modal.getByLabel("Nombre").fill("Duplicado");
  await modal.getByLabel("Apellido").fill("PRUEBA");
  await modal.getByLabel("Email").fill(ADMIN_E2E.email.toUpperCase());
  await modal.getByLabel("Usuario", { exact: true }).fill(unico("prueba-dup"));
  await modal.getByLabel("Clave inicial").fill("clave-inicial-1");
  await modal.getByRole("button", { name: "Guardar usuario" }).click();

  await expect(modal.getByText(/ya existe un usuario/i)).toBeVisible();
});
