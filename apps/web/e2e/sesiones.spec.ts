import type { Browser, Page } from "@playwright/test";

import { api } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

const CLAVE = "clave-operador-1";

async function crearOperador() {
  const usuario = unico("prueba-sesiones").toLowerCase();
  const { idUsuario } = await api<{ idUsuario: string }>("POST", "/api/usuarios", {
    nombre: "Operador",
    apellido: "Sesiones",
    email: `${usuario}@mymbpm.test`,
    usuario,
    password: CLAVE
  });
  return { usuario, idUsuario };
}

async function ingresar(browser: Browser, usuario: string, clave = CLAVE): Promise<Page> {
  const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await page.goto("/ingresar");
  await page.getByLabel("Usuario o email").fill(usuario);
  await page.getByLabel("Clave").fill(clave);
  await page.getByRole("button", { name: /ingresar/i }).click();
  await expect(page).toHaveURL(/\/panel$/);
  return page;
}

async function tokenDe(usuario: string, clave = CLAVE) {
  const respuesta = await fetch(`${URL_WEB}/api/autenticacion/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identificador: usuario, password: clave })
  });
  return ((await respuesta.json()) as { data: { token: string } }).data.token;
}

function me(token: string) {
  return fetch(`${URL_WEB}/api/autenticacion/me`, { headers: { authorization: `Bearer ${token}` } });
}

test("el administrador cierra las sesiones de un usuario: sus dispositivos vuelven al ingreso", async ({ page, browser }) => {
  const operador = await crearOperador();
  const celular = await ingresar(browser, operador.usuario);
  const tokenCompu = await tokenDe(operador.usuario);
  expect((await me(tokenCompu)).status).toBe(200);

  // Los tokens llevan la hora en segundos: se espera a cambiar de segundo para que el corte
  // quede despues de ambos ingresos.
  await new Promise((listo) => setTimeout(listo, 1100));

  await page.goto("/usuarios");
  await page.getByLabel("Filtrar por estado").selectOption("activos");
  const fila = page.getByRole("row").filter({ hasText: operador.usuario });
  await fila.getByRole("button", { name: "Cerrar sesiones" }).click();
  const modal = page.getByRole("dialog", { name: "Cerrar sesiones" });
  await expect(modal).toContainText(`${operador.usuario} va a tener que ingresar de nuevo`);
  await modal.getByRole("button", { name: "Cerrar sesiones" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Se cerraron las sesiones" })).toContainText(operador.usuario);

  // La API rechaza los tokens anteriores al corte.
  const rechazo = await me(tokenCompu);
  expect(rechazo.status).toBe(401);
  expect(((await rechazo.json()) as { error: { message: string } }).error.message).toBe("La sesion se cerro: ingresa de nuevo");

  // El celular, al moverse, vuelve al ingreso con el aviso.
  await celular.goto("/clientes");
  await expect(celular).toHaveURL(/\/ingresar\?sesion=cerrada$/);
  await expect(celular.getByRole("status")).toHaveText("Tu sesion vencio o se cerro. Ingresa de nuevo.");

  // Puede volver a ingresar y el token nuevo vale.
  await celular.getByLabel("Usuario o email").fill(operador.usuario);
  await celular.getByLabel("Clave").fill(CLAVE);
  await celular.getByRole("button", { name: /ingresar/i }).click();
  await expect(celular).toHaveURL(/\/panel$/);
  await celular.close();
});

test("si la sesion se cierra mientras se usa una pantalla, la siguiente accion vuelve al ingreso", async ({ browser }) => {
  const operador = await crearOperador();
  const pantalla = await ingresar(browser, operador.usuario);
  await pantalla.goto("/clientes");
  await expect(pantalla.getByLabel("Buscar cliente")).toBeVisible();

  await new Promise((listo) => setTimeout(listo, 1100));
  await api("POST", `/api/usuarios/${operador.idUsuario}/cerrar-sesiones`);

  // Sin recargar: la busqueda llama a la API con el token viejo.
  await pantalla.getByLabel("Buscar cliente").fill("algo");
  await pantalla.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(pantalla).toHaveURL(/\/ingresar\?sesion=cerrada$/);
  await pantalla.close();
});

test("restablecer la clave corta las sesiones abiertas", async () => {
  const operador = await crearOperador();
  const token = await tokenDe(operador.usuario);

  await new Promise((listo) => setTimeout(listo, 1100));
  await api("PATCH", `/api/usuarios/${operador.idUsuario}/restablecer-clave`, { passwordNueva: "otra-clave-5678" });

  expect((await me(token)).status).toBe(401);
  expect((await me(await tokenDe(operador.usuario, "otra-clave-5678"))).status).toBe(200);
});

test("un operador no puede cerrar sesiones de otros", async () => {
  const operador = await crearOperador();
  const otro = await crearOperador();
  const token = await tokenDe(operador.usuario);

  const respuesta = await fetch(`${URL_WEB}/api/usuarios/${otro.idUsuario}/cerrar-sesiones`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });

  expect(respuesta.status).toBe(403);
});
