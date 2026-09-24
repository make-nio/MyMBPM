import type { Page } from "@playwright/test";

import { URL_WEB } from "./entorno";
import { expect, test } from "./fixtures";

// El servidor de E2E aplica out/_headers como Netlify (e2e/servidor-estatico.mjs): estas pruebas
// corren con la misma CSP que produccion. Todas las demas pruebas tambien, asi que una pagina que
// no hidrata por un script bloqueado ya las haria fallar; aca se verifica que no quede ninguna
// violacion en la consola.

const pantallas: Array<{ ruta: string; alta?: string }> = [
  { ruta: "/panel" },
  { ruta: "/categorias", alta: "Nueva categoria" },
  { ruta: "/clientes", alta: "Nuevo cliente" },
  { ruta: "/items-catalogo", alta: "Nuevo item" },
  { ruta: "/solicitudes-especiales", alta: "Nueva solicitud" },
  { ruta: "/usuarios", alta: "Nuevo usuario" },
  { ruta: "/pedidos", alta: "Nuevo pedido" },
  { ruta: "/produccion", alta: "Nueva orden" },
  { ruta: "/stock" },
  { ruta: "/reportes" },
  { ruta: "/ayuda" }
];

// Junta las violaciones de CSP: el evento del documento y los mensajes de la consola.
async function vigilarCsp(page: Page) {
  const violaciones: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (evento) => {
      (window as unknown as { __csp: string[] }).__csp ??= [];
      (window as unknown as { __csp: string[] }).__csp.push(`${evento.violatedDirective} ${evento.blockedURI}`);
    });
  });
  page.on("console", (mensaje) => {
    if (/Content Security Policy/i.test(mensaje.text())) {
      violaciones.push(mensaje.text());
    }
  });

  return async () => [
    ...violaciones,
    ...((await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])) as string[])
  ];
}

test("los documentos salen con los encabezados de seguridad", async ({ page }) => {
  const respuesta = await page.goto("/ingresar");
  const encabezados = respuesta?.headers() ?? {};

  expect(encabezados["content-security-policy"]).toContain("script-src 'self' 'sha256-");
  expect(encabezados["content-security-policy"]).not.toContain("'unsafe-inline' 'sha256");
  expect(encabezados["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(encabezados["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
  expect(encabezados["x-content-type-options"]).toBe("nosniff");
  expect(encabezados["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(encabezados["permissions-policy"]).toContain("camera=()");
  expect(encabezados["x-frame-options"]).toBe("DENY");
});

test("la API responde sin cache y con nosniff", async () => {
  const respuesta = await fetch(`${URL_WEB}/api/health`);

  expect(respuesta.headers.get("x-content-type-options")).toBe("nosniff");
  expect(respuesta.headers.get("cache-control")).toBe("no-store");
  expect(respuesta.headers.get("x-powered-by")).toBeNull();
});

test.describe("sin sesion", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("el ingreso no tiene violaciones de CSP", async ({ page }) => {
    const violaciones = await vigilarCsp(page);
    await page.goto("/ingresar");
    await expect(page.getByLabel("Usuario o email")).toBeVisible();

    expect(await violaciones()).toEqual([]);
  });
});

test("ninguna pantalla ni su alta tiene violaciones de CSP", async ({ page }) => {
  test.setTimeout(120_000);
  const violaciones = await vigilarCsp(page);

  for (const pantalla of pantallas) {
    await page.goto(pantalla.ruta);
    await expect(page.getByText(/^Cargando/)).toHaveCount(0);

    if (pantalla.alta) {
      await page.getByRole("button", { name: pantalla.alta }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }

    expect(await violaciones(), `violaciones de CSP en ${pantalla.ruta}`).toEqual([]);
  }

  // Navegacion del lado del cliente (sin recargar): Next trae el contenido de la otra pantalla.
  await page.goto("/panel");
  await page.getByRole("navigation", { name: "Menu principal" }).getByRole("link", { name: "Stock" }).click();
  await expect(page).toHaveURL(/\/stock$/);
  await expect(page.getByLabel("Buscar item")).toBeVisible();
  expect(await violaciones()).toEqual([]);
});
