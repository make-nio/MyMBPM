import type { ClaveEndpoint, CuerpoDe, RespuestaDe } from "@contrato";

type ApiRequestInit = RequestInit & {
  token?: string;
};

const CLAVE_TOKEN = "mlm_bpm_token";
export const RUTA_SESION_CERRADA = "/ingresar?sesion=cerrada";

function leerTokenActual() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(CLAVE_TOKEN);
}

export class ErrorApi extends Error {
  readonly status: number;
  // Codigo de la solicitud que fallo (header X-Referencia): el mismo queda en el log de la API.
  readonly referencia: string | null;
  // error.detalles de la API: en una validacion, los campos; en un duplicado, { target: [columna] }.
  readonly detalles: unknown;

  constructor(message: string, status: number, referencia: string | null = null, detalles: unknown = null) {
    super(message);
    this.name = "ErrorApi";
    this.status = status;
    this.referencia = referencia;
    this.detalles = detalles;
  }
}

// En un error del servidor el mensaje lleva la referencia: cualquier pantalla que muestre el
// error la muestra, y con ella se encuentra el error en el log de Netlify.
export function mensajeConReferencia(message: string, status: number, referencia: string | null) {
  if (status < 500 || !referencia) {
    return message;
  }

  return `${message}. Referencia del error: ${referencia} (pasasela a quien administra el sistema si se repite).`;
}

export async function apiFetch<T>(path: string, init: ApiRequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = init.token ?? leerTokenActual();

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers
  });

  const body = await response.json().catch(() => null);

  // La sesion vencio o la cerro un administrador mientras se usaba la web: se vuelve al ingreso
  // con un aviso. Las rutas de autenticacion manejan su propio 401 (clave incorrecta, /me).
  if (response.status === 401 && token && !path.startsWith("/api/autenticacion/") && typeof window !== "undefined") {
    window.localStorage.removeItem(CLAVE_TOKEN);
    window.location.assign(RUTA_SESION_CERRADA);
  }

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      "No fue posible completar la solicitud";
    const referencia: string | null = body?.error?.referencia || response.headers?.get?.("X-Referencia") || null;

    throw new ErrorApi(
      mensajeConReferencia(message, response.status, referencia),
      response.status,
      referencia,
      body?.error?.detalles ?? null
    );
  }

  return body as T;
}

// Parametros de ruta de un endpoint del contrato: "get /api/pedidos/{id}/detalles/{detalleId}"
// -> "id" | "detalleId".
type ParametrosDe<K extends string> = K extends `${string}{${infer P}}${infer Resto}` ? P | ParametrosDe<Resto> : never;

type OpcionesPedido<K extends ClaveEndpoint> = {
  consulta?: Parameters<typeof buildQuery>[0];
  cuerpo?: CuerpoDe<K>;
} & ([ParametrosDe<K>] extends [never] ? { params?: undefined } : { params: Record<ParametrosDe<K>, string> });

// Pide un endpoint del contrato de la API (apps/api/src/contrato) por su clave, por ejemplo
// "get /api/clientes/{id}": el metodo y la ruta salen de la clave, y los tipos de los parametros,
// del cuerpo y de la respuesta, del contrato. Asi la web no puede separarse de lo que la API
// recibe y devuelve (que los E2E validan contra el mismo contrato).
export function pedirApi<K extends ClaveEndpoint>(
  endpoint: K,
  ...[opciones]: [ParametrosDe<K>] extends [never] ? [OpcionesPedido<K>?] : [OpcionesPedido<K>]
) {
  const [metodo, plantilla] = endpoint.split(" ");
  const params: Record<string, string> = opciones?.params ?? {};
  const ruta = plantilla.replace(/\{(\w+)\}/g, (_, nombre: string) => encodeURIComponent(params[nombre]));
  const consulta = opciones?.consulta ? buildQuery(opciones.consulta) : "";

  return apiFetch<{ ok: true; data: RespuestaDe<K> }>(`${ruta}${consulta}`, {
    method: metodo.toUpperCase(),
    body: opciones?.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo)
  }).then((respuesta) => respuesta.data);
}

export function buildQuery(
  params: Record<string, string | number | boolean | null | undefined>
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}
