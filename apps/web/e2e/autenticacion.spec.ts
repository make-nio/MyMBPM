import { ADMIN_E2E } from "./entorno";
import { expect, test } from "./fixtures";

test.describe("sin sesion", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("una ruta privada redirige al ingreso", async ({ page }) => {
    await page.goto("/categorias");

    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test("rechaza credenciales invalidas", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByLabel("Usuario o email").fill(ADMIN_E2E.usuario);
    await page.getByLabel("Clave").fill("clave-incorrecta");
    await page.getByRole("button", { name: /ingresar/i }).click();

    await expect(page.locator(".mensaje-error, [role=alert]").first()).toBeVisible();
    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test("ingresa con usuario sin distinguir mayusculas y cierra sesion", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByLabel("Usuario o email").fill(ADMIN_E2E.usuario.toUpperCase());
    await page.getByLabel("Clave").fill(ADMIN_E2E.password);
    await page.getByRole("button", { name: /ingresar/i }).click();

    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByText(`${ADMIN_E2E.nombre} ${ADMIN_E2E.apellido}`)).toBeVisible();

    await page.getByRole("button", { name: /cerrar sesion|salir/i }).click();
    await expect(page).toHaveURL(/\/ingresar$/);
  });
});

test("con sesion, el inicio lleva al panel", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/panel$/);
});

test("recargar varias veces seguidas no cierra la sesion", async ({ page }) => {
  await page.goto("/pedidos");
  await page.goto("/pedidos");
  await page.goto("/clientes");

  await expect(page).toHaveURL(/\/clientes$/);
  await expect(page.getByRole("heading", { name: "Clientes", exact: true, level: 1 })).toBeVisible();
});

test("si no se puede verificar la sesion, ofrece reintentar sin cerrarla", async ({ page }) => {
  let fallar = true;
  await page.route("**/api/autenticacion/me", (route) => (fallar ? route.abort("failed") : route.continue()));

  await page.goto("/categorias");
  await expect(page.getByRole("heading", { name: "No se pudo verificar la sesion" })).toBeVisible();
  await expect(page).toHaveURL(/\/categorias$/);

  fallar = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("heading", { name: "Categorias", exact: true, level: 1 })).toBeVisible();
});
