import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, buildQuery, ErrorApi, pedirApi } from "./api";
import { guardarToken, leerToken, limpiarSesion, resolverSesionActual } from "./auth";

function respuesta(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new Error("sin cuerpo")) : Promise.resolve(body))
  } as Response;
}

const almacenamiento = new Map<string, string>();
const fetchMock = vi.fn();

beforeEach(() => {
  almacenamiento.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (clave: string) => almacenamiento.get(clave) ?? null,
      setItem: (clave: string, valor: string) => void almacenamiento.set(clave, valor),
      removeItem: (clave: string) => void almacenamiento.delete(clave)
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pedirApi", () => {
  it("arma metodo y ruta desde la clave del contrato, con parametros, consulta y cuerpo", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true, data: { idPedidoDetalle: "7" } }));

    const data = await pedirApi("patch /api/pedidos/{id}/detalles/{detalleId}", {
      params: { id: "12", detalleId: "7" },
      cuerpo: { cantidad: 3 }
    });

    expect(data).toEqual({ idPedidoDetalle: "7" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/pedidos/12/detalles/7");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ cantidad: 3 }));
  });

  it("agrega la consulta y no manda cuerpo en un GET", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true, data: [] }));

    await pedirApi("get /api/clientes", { consulta: { busqueda: "maxi", limit: 20, activo: undefined } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/clientes?busqueda=maxi&limit=20");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("codifica los parametros de ruta", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true, data: {} }));

    await pedirApi("get /api/clientes/{id}", { params: { id: "1/2" } });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/clientes/1%2F2");
  });
});

describe("buildQuery", () => {
  it("omite valores vacios y serializa el resto", () => {
    expect(buildQuery({ activo: false, limit: 20, busqueda: "", offset: undefined, x: null })).toBe(
      "?activo=false&limit=20"
    );
  });

  it("devuelve cadena vacia si no hay parametros", () => {
    expect(buildQuery({ activo: undefined })).toBe("");
  });
});

describe("apiFetch", () => {
  it("llama a la ruta relativa (mismo dominio) con el token guardado y JSON", async () => {
    guardarToken("token-1");
    fetchMock.mockResolvedValue(respuesta(200, { ok: true, data: [] }));

    await apiFetch("/api/categorias", { method: "POST", body: "{}" });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(url).toBe("/api/categorias");
    expect(headers.get("Authorization")).toBe("Bearer token-1");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("no agrega Authorization sin sesion ni Content-Type sin cuerpo", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true, data: null }));

    await apiFetch("/api/health");

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("propaga el mensaje de error de la API con su status", async () => {
    fetchMock.mockResolvedValue(respuesta(409, { ok: false, error: { message: "Stock insuficiente" } }));

    const llamada = apiFetch("/api/pedidos/1/confirmar", { method: "POST" });

    await expect(llamada).rejects.toBeInstanceOf(ErrorApi);
    await expect(llamada).rejects.toMatchObject({ message: "Stock insuficiente", status: 409 });
  });

  it("en un error del servidor muestra la referencia en el mensaje", async () => {
    fetchMock.mockResolvedValue(
      respuesta(500, { ok: false, error: { codigo: "ERROR_INTERNO", message: "Ocurrio un error interno", referencia: "3F9A-12BC" } })
    );

    await expect(apiFetch("/api/pedidos")).rejects.toMatchObject({
      message: expect.stringContaining("Referencia del error: 3F9A-12BC"),
      status: 500,
      referencia: "3F9A-12BC"
    });
  });

  it("toma la referencia del header si el cuerpo no es JSON (por ejemplo, un 502 del proxy)", async () => {
    fetchMock.mockResolvedValue({ ...respuesta(502, undefined), headers: new Headers({ "X-Referencia": "AAAA-0001" }) });

    await expect(apiFetch("/api/pedidos")).rejects.toMatchObject({
      message: expect.stringContaining("AAAA-0001"),
      referencia: "AAAA-0001"
    });
  });

  it("en errores de validacion o negocio no agrega la referencia al mensaje", async () => {
    fetchMock.mockResolvedValue(respuesta(409, { ok: false, error: { message: "Stock insuficiente", referencia: "3F9A-12BC" } }));

    await expect(apiFetch("/api/pedidos")).rejects.toMatchObject({ message: "Stock insuficiente", referencia: "3F9A-12BC" });
  });

  it("con sesion, un 401 borra el token y vuelve al ingreso con aviso", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { ...window, location: { assign } });
    guardarToken("token-vencido");
    fetchMock.mockResolvedValue(respuesta(401, { ok: false, error: { message: "La sesion se cerro: ingresa de nuevo" } }));

    await expect(apiFetch("/api/pedidos")).rejects.toMatchObject({ status: 401 });
    expect(leerToken()).toBeNull();
    expect(assign).toHaveBeenCalledWith("/ingresar?sesion=cerrada");
  });

  it("un 401 de las rutas de autenticacion (clave incorrecta) no redirige", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { ...window, location: { assign } });
    guardarToken("token");
    fetchMock.mockResolvedValue(respuesta(401, { ok: false, error: { message: "Credenciales invalidas" } }));

    await expect(apiFetch("/api/autenticacion/login", { method: "POST" })).rejects.toMatchObject({ status: 401 });
    expect(assign).not.toHaveBeenCalled();
    expect(leerToken()).toBe("token");
  });

  it("usa un mensaje generico si la respuesta de error no es JSON", async () => {
    fetchMock.mockResolvedValue(respuesta(502, undefined));

    await expect(apiFetch("/api/health")).rejects.toMatchObject({
      message: "No fue posible completar la solicitud",
      status: 502
    });
  });
});

describe("sesion", () => {
  it("guarda, lee y limpia el token", () => {
    guardarToken("abc");
    expect(leerToken()).toBe("abc");

    limpiarSesion();
    expect(leerToken()).toBeNull();
  });

  it("sin token no consulta la API", async () => {
    await expect(resolverSesionActual()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con token invalido limpia la sesion", async () => {
    guardarToken("vencido");
    fetchMock.mockResolvedValue(respuesta(401, { ok: false, error: { message: "Token invalido" } }));

    await expect(resolverSesionActual()).resolves.toBeNull();
    expect(leerToken()).toBeNull();
  });

  it("ante un error de red conserva el token y relanza", async () => {
    guardarToken("valido");
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(resolverSesionActual()).rejects.toThrow("Failed to fetch");
    expect(leerToken()).toBe("valido");
  });

  it("ante un error del servidor conserva el token", async () => {
    guardarToken("valido");
    fetchMock.mockResolvedValue(respuesta(503, { ok: false, error: { message: "Base no disponible" } }));

    await expect(resolverSesionActual()).rejects.toMatchObject({ status: 503 });
    expect(leerToken()).toBe("valido");
  });

  it("con token valido devuelve el usuario", async () => {
    guardarToken("valido");
    fetchMock.mockResolvedValue(respuesta(200, { ok: true, data: { usuario: "admin" } }));

    await expect(resolverSesionActual()).resolves.toMatchObject({ token: "valido", usuario: { usuario: "admin" } });
  });
});
