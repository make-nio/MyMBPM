import { endpoints } from "../../api/src/contrato/endpoints";

import { api } from "./api";
import { revisarContratoFetch } from "./contrato";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

// Matriz de autorizacion: cada endpoint del contrato declara quien puede usarlo (acceso) y esta
// prueba lo comprueba contra la API real, sin sesion, con un operador y con el administrador.
// Un endpoint nuevo entra solo en la matriz: el contrato no compila sin acceso.

// Un id que no existe: los endpoints con {id} responden 404 o 400 sin tocar nada.
const ID_INEXISTENTE = "999999999";

type Llamada = { status: number; cuerpo: unknown };

async function llamar(metodo: string, ruta: string, token: string | null): Promise<Llamada> {
  const conCuerpo = metodo !== "get" && metodo !== "delete";
  const respuesta = await fetch(`${URL_WEB}${ruta}`, {
    method: metodo.toUpperCase(),
    headers: {
      ...(conCuerpo ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    // Un arreglo no es el objeto que esperan los cuerpos: si la autorizacion deja pasar, la
    // validacion responde 400 y no se crea ni modifica nada.
    body: conCuerpo ? "[]" : undefined
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

function rutaCon(ruta: string, idPropio: string | null) {
  return ruta.replace(/\{\w+\}/g, idPropio ?? ID_INEXISTENTE);
}

let tokenOperador = "";
let idOperador = "";
let tokenAdmin = "";

test.beforeAll(async () => {
  const usuario = unico("prueba-matriz").toLowerCase();
  const password = "clave-matriz-1";
  const alta = await api<{ idUsuario: string }>("POST", "/api/usuarios", {
    nombre: "Operador",
    apellido: "PRUEBA",
    email: `${usuario}@mymbpm.test`,
    usuario,
    password
  });
  idOperador = alta.idUsuario;
  tokenOperador = (await api<{ token: string }>("POST", "/api/autenticacion/login", { identificador: usuario, password })).token;
});

test("cada endpoint cumple su acceso: sin sesion, operador y administrador", async ({ page }) => {
  // El token del administrador E2E es el que usa e2e/api.ts (sesion guardada por global-setup).
  await page.goto("/panel");
  tokenAdmin = (await page.evaluate(() => window.localStorage.getItem("mlm_bpm_token"))) ?? "";
  expect(tokenAdmin).not.toBe("");

  const problemas: string[] = [];

  for (const endpoint of endpoints) {
    const clave = `${endpoint.metodo.toUpperCase()} ${endpoint.ruta}`;
    const ruta = rutaCon(endpoint.ruta, null);

    const sinSesion = await llamar(endpoint.metodo, ruta, null);
    if (endpoint.acceso === "publico" ? sinSesion.status === 401 : sinSesion.status !== 401) {
      problemas.push(`${clave} sin sesion: ${sinSesion.status} (acceso ${endpoint.acceso})`);
    }

    const rutaOperador = rutaCon(endpoint.ruta, "soloPropio" in endpoint && endpoint.soloPropio ? idOperador : null);
    const operador = await llamar(endpoint.metodo, rutaOperador, tokenOperador);
    const operadorRechazado = operador.status === 401 || operador.status === 403;
    if (endpoint.acceso === "administrador" ? operador.status !== 403 : operadorRechazado) {
      problemas.push(`${clave} operador: ${operador.status} (acceso ${endpoint.acceso})`);
    }

    // Un endpoint soloPropio sobre un id ajeno se rechaza tambien al administrador (lo prueba
    // el punto de registros ajenos); aca solo interesa que el administrador no quede afuera del resto.
    const soloPropio = "soloPropio" in endpoint && endpoint.soloPropio;
    const admin = await llamar(endpoint.metodo, ruta, tokenAdmin);
    if (!soloPropio && (admin.status === 401 || admin.status === 403)) {
      problemas.push(`${clave} administrador: ${admin.status}`);
    }

    // Las respuestas de error tambien cumplen el contrato (formato comun de error).
    for (const [quien, llamada, rutaUsada] of [
      ["sin sesion", sinSesion, ruta],
      ["operador", operador, rutaOperador],
      ["administrador", admin, ruta]
    ] as const) {
      for (const problema of revisarContratoFetch(endpoint.metodo, `${URL_WEB}${rutaUsada}`, llamada.status, llamada.cuerpo)) {
        problemas.push(`${quien}: ${problema}`);
      }
    }
  }

  expect(problemas).toEqual([]);
});
