import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { ADMIN_E2E, ARCHIVO_SESION_ADMIN, URL_WEB } from "./entorno";

type Respuesta<T> = { ok: boolean; data: T; error?: { message: string } };

async function llamarApi<T>(path: string, body: unknown) {
  const response = await fetch(`${URL_WEB}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  return { status: response.status, body: (await response.json()) as Respuesta<T> };
}

// Deja lista la sesion del administrador de pruebas. Con la base vacia usa el alta inicial
// (POST /api/usuarios sin token crea al primer administrador); si ya hay usuarios, inicia sesion.
export default async function globalSetup() {
  const alta = await llamarApi("/api/usuarios", ADMIN_E2E);

  if (alta.status !== 201 && alta.status !== 401) {
    throw new Error(`No se pudo preparar el administrador E2E: ${alta.status} ${JSON.stringify(alta.body)}`);
  }

  const login = await llamarApi<{ token: string }>("/api/autenticacion/login", {
    identificador: ADMIN_E2E.usuario,
    password: ADMIN_E2E.password
  });

  if (login.status !== 200) {
    throw new Error(
      "No se pudo iniciar sesion con el administrador E2E. La base ya tenia usuarios creados por " +
        "otro medio: usa una base local vacia (E2E_DATABASE_URL) o define E2E_ADMIN_USUARIO/E2E_ADMIN_PASSWORD."
    );
  }

  mkdirSync(dirname(ARCHIVO_SESION_ADMIN), { recursive: true });
  writeFileSync(
    ARCHIVO_SESION_ADMIN,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: URL_WEB,
          localStorage: [{ name: "mlm_bpm_token", value: login.body.data.token }]
        }
      ]
    })
  );
}
