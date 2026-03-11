import { getApiUrl } from "./env";

type ApiRequestInit = RequestInit & {
  token?: string;
};

function leerTokenActual() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("mlm_bpm_token");
}

export class ErrorApi extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ErrorApi";
    this.status = status;
  }
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

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      "No fue posible completar la solicitud";

    throw new ErrorApi(message, response.status);
  }

  return body as T;
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
