import { api } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

test("la ayuda se abre desde el menu y explica los pasos y los estados", async ({ page }) => {
  await page.goto("/panel");
  await page.getByRole("link", { name: "Ayuda" }).click();
  await expect(page).toHaveURL(/\/ayuda$/);
  await expect(page.getByRole("heading", { name: "Como se usa" })).toBeVisible();

  for (const guia of ["Cargar un pedido", "Confirmar un pedido", "Producir", "Ajustar el stock", "Costos y ganancia (administradores)"]) {
    await expect(page.getByRole("region", { name: guia }).getByRole("listitem").first()).toBeVisible();
  }

  const estados = page.getByRole("region", { name: "Que significa cada estado" });
  await expect(estados.getByRole("definition").filter({ hasText: "Ya se desconto el stock" })).toBeVisible();
  // Los avisos importantes: cancelar no devuelve el stock.
  await expect(page.getByRole("region", { name: "Confirmar un pedido" })).toContainText("no devuelve el stock");
  await expect(page.getByRole("region", { name: "Producir" })).toContainText("no vuelven al stock");
});

test("la guia del administrador: la ve un administrador y no un operador", async ({ page, browser }) => {
  await page.goto("/ayuda");
  const guia = page.getByRole("region", { name: "Guia del administrador" });
  for (const tema of ["Usuarios", "Importar el catalogo", "Exportar a CSV", "Reportes", "Respaldos", "Si aparece un error con referencia"]) {
    await expect(guia.getByRole("heading", { name: tema, exact: true })).toBeVisible();
  }
  await expect(guia.getByRole("region", { name: "Respaldos" })).toContainText("Quedan las ultimas 14");
  await expect(guia.getByRole("region", { name: "Si aparece un error con referencia" })).toContainText("Referencia del error");

  const usuario = unico("prueba-operador-ayuda").toLowerCase();
  await api("POST", "/api/usuarios", {
    nombre: "Operador",
    apellido: "PRUEBA",
    email: `${usuario}@mymbpm.test`,
    usuario,
    password: "clave-operador-1"
  });
  const login = await fetch(`${URL_WEB}/api/autenticacion/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identificador: usuario, password: "clave-operador-1" })
  });
  const token = ((await login.json()) as { data: { token: string } }).data.token;
  const contexto = await browser.newContext({
    storageState: { cookies: [], origins: [{ origin: URL_WEB, localStorage: [{ name: "mlm_bpm_token", value: token }] }] }
  });
  const paginaOperador = await contexto.newPage();
  await paginaOperador.goto(`${URL_WEB}/ayuda`);
  await expect(paginaOperador.getByRole("heading", { name: "Como se usa" })).toBeVisible();
  await expect(paginaOperador.getByRole("region", { name: "Guia del administrador" })).toHaveCount(0);
  await contexto.close();
});
