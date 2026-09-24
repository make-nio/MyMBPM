import { URL_WEB } from "./entorno";
import { expect, test } from "./fixtures";

test("cada respuesta de la API trae su referencia en el header X-Referencia", async () => {
  const respuesta = await fetch(`${URL_WEB}/api/health`);

  expect(respuesta.headers.get("x-referencia")).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
});

test("un error del servidor muestra la referencia en pantalla, para poder buscarla en el log", async ({ page }) => {
  // La API real no falla a pedido: se simula el 500 tal como lo responde el manejo de errores.
  await page.route("**/api/clientes?**", (ruta) =>
    ruta.fulfill({
      status: 500,
      contentType: "application/json",
      headers: { "X-Referencia": "3F9A-12BC" },
      body: JSON.stringify({ ok: false, error: { codigo: "ERROR_INTERNO", message: "Ocurrio un error interno", referencia: "3F9A-12BC" } })
    })
  );

  await page.goto("/clientes");

  await expect(page.getByText(/Ocurrio un error interno\. Referencia del error: 3F9A-12BC/)).toBeVisible();
});
