import { api } from "./api";
import { ADMIN_E2E } from "./entorno";
import { expect, test, unico } from "./fixtures";

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
    // exact: el panel tambien muestra el nombre en "fecha · Nombre" de los ultimos movimientos.
    await expect(page.getByText(`${ADMIN_E2E.nombre} ${ADMIN_E2E.apellido}`, { exact: true })).toBeVisible();

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

test.describe("limite de intentos", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("5 claves incorrectas bloquean la cuenta aunque despues se use la correcta", async ({ page }) => {
    const usuario = unico("prueba-bloqueo").toLowerCase();
    await api("POST", "/api/usuarios", {
      nombre: "Bloqueo",
      apellido: "PRUEBA",
      email: `${usuario}@mymbpm.test`,
      usuario,
      password: "clave-correcta-1"
    });

    await page.goto("/ingresar");
    const error = page.locator(".mensaje-error, [role=alert]").first();

    for (let intento = 1; intento <= 5; intento++) {
      await page.getByLabel("Usuario o email").fill(usuario);
      await page.getByLabel("Clave").fill(`clave-incorrecta-${intento}`);
      await page.getByRole("button", { name: /ingresar/i }).click();
      await expect(error).toContainText("Credenciales invalidas");
    }

    // Por email cuenta como la misma cuenta, y con la clave correcta tampoco entra.
    await page.getByLabel("Usuario o email").fill(`${usuario}@mymbpm.test`);
    await page.getByLabel("Clave").fill("clave-correcta-1");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(error).toContainText(/Demasiados intentos fallidos\. Proba de nuevo en 1[45] minutos/);
    await expect(page).toHaveURL(/\/ingresar$/);

    // Otra cuenta desde la misma IP sigue pudiendo entrar.
    await page.getByLabel("Usuario o email").fill(ADMIN_E2E.usuario);
    await page.getByLabel("Clave").fill(ADMIN_E2E.password);
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page).toHaveURL(/\/panel$/);
  });
});
