import { getApiUrl } from "./env";

type ApiRequestInit = RequestInit & {
  token?: string;
};

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

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (init.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
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
