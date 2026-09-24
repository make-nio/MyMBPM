import { expect, test } from "@playwright/test";

// Humo del sitio publicado: la API y la base responden, el ingreso carga con la CSP de
// produccion y sin errores. Solo pedidos GET: no inicia sesion ni escribe nada.

test("la API y la base responden", async ({ request }) => {
  const respuesta = await request.get("/api/health");
  const cuerpo = (await respuesta.json()) as { status: string; base: { estado: string; latenciaMs: number | null; motivo?: string } };

  expect(respuesta.status(), `health respondio ${respuesta.status()}: ${JSON.stringify(cuerpo)}`).toBe(200);
  expect(cuerpo.status).toBe("ok");
  expect(cuerpo.base.estado).toBe("ok");
  console.log(`Base: ${cuerpo.base.latenciaMs} ms`);
});

test("el ingreso carga sin errores de consola ni violaciones de CSP", async ({ page, baseURL }) => {
  const errores: string[] = [];
  const fallidas: string[] = [];
  const origen = new URL(baseURL ?? "").origin;

  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (evento) => {
      (window as unknown as { __csp: string[] }).__csp ??= [];
      (window as unknown as { __csp: string[] }).__csp.push(`${evento.violatedDirective} ${evento.blockedURI}`);
    });
  });
  page.on("console", (mensaje) => {
    if (mensaje.type() === "error") {
      errores.push(mensaje.text());
    }
  });
  page.on("pageerror", (error) => errores.push(error.message));
  page.on("response", (respuesta) => {
    if (respuesta.status() >= 400 && respuesta.url().startsWith(origen)) {
      fallidas.push(`${respuesta.status()} ${respuesta.url()}`);
    }
  });

  const documento = await page.goto("/ingresar");
  expect(documento?.status()).toBe(200);
  expect(documento?.headers()["content-security-policy"], "el documento sale sin CSP").toContain("default-src 'self'");

  // El campo aparece solo si React hidrato: si la CSP bloqueara un script, no estaria.
  await expect(page.getByLabel("Usuario o email")).toBeVisible();
  await expect(page.getByRole("button", { name: /ingresar/i })).toBeEnabled();
  await page.waitForLoadState("networkidle");

  const violaciones = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
  expect(violaciones, "violaciones de CSP").toEqual([]);
  expect(fallidas, "pedidos al sitio con error").toEqual([]);
  expect(errores, "errores en la consola").toEqual([]);
});
