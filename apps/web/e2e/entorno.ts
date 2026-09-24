// Configuracion compartida de las pruebas E2E (config, setup y fixtures).

export const PUERTO_WEB = Number(process.env.E2E_PUERTO_WEB || 3100);
export const PUERTO_API = Number(process.env.E2E_PUERTO_API || 3102);
export const URL_WEB = `http://localhost:${PUERTO_WEB}`;

export const BASE_DATOS_E2E =
  process.env.E2E_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/mymbpm_e2e";

export const COBERTURA_E2E = process.env.E2E_COVERAGE === "1";

export const ADMIN_E2E = {
  nombre: "Admin",
  apellido: "E2E",
  email: process.env.E2E_ADMIN_EMAIL || "admin-e2e@mymbpm.test",
  usuario: process.env.E2E_ADMIN_USUARIO || "admin-e2e",
  password: process.env.E2E_ADMIN_PASSWORD || "clave-e2e-1234"
};

export const ARCHIVO_SESION_ADMIN = "e2e/.auth/admin.json";

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// Los E2E crean usuarios, pedidos y movimientos de stock que no se pueden borrar por la API.
// Nunca deben correr contra la base de produccion (ni contra un deploy preview, que hoy usa la
// misma base): solo contra un Postgres local o el servicio del job de CI.
export function validarBaseLocal(url: string) {
  const host = new URL(url).hostname;

  if (!HOSTS_LOCALES.has(host)) {
    throw new Error(
      `Los E2E solo corren contra un Postgres local; E2E_DATABASE_URL apunta a "${host}".`
    );
  }
}
