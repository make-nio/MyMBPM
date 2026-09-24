import { describe, expect, it, vi } from "vitest";

import { ErrorProhibido } from "../errores/error-prohibido";

import { ocultarCostosSinPermiso, quitarCostos, rechazarCostoSinPermiso } from "./costos-solo-con-permiso.middleware";

const operador = { esAdministrador: false } as never;
const administrador = { esAdministrador: true } as never;

describe("quitarCostos", () => {
  it("saca costo y costoUnitario a cualquier profundidad y deja el resto", () => {
    const respuesta = {
      ok: true,
      data: {
        idOrdenProduccion: "1",
        detalles: [{ cantidad: "2", itemCatalogoProducto: { nombre: "Vela", precio: "100", costo: "40" } }],
        consumos: [{ itemCatalogoInsumo: { nombre: "Cera", costo: "5" }, costoUnitario: "5" }]
      }
    };

    expect(quitarCostos(respuesta)).toEqual({
      ok: true,
      data: {
        idOrdenProduccion: "1",
        detalles: [{ cantidad: "2", itemCatalogoProducto: { nombre: "Vela", precio: "100" } }],
        consumos: [{ itemCatalogoInsumo: { nombre: "Cera" } }]
      }
    });
  });

  it("no toca valores que no son objetos planos", () => {
    const fecha = new Date("2026-09-24T00:00:00Z");

    expect(quitarCostos(fecha)).toBe(fecha);
    expect(quitarCostos("costo")).toBe("costo");
    expect(quitarCostos(null)).toBeNull();
  });
});

describe("ocultarCostosSinPermiso", () => {
  function responder(usuarioAutenticado: unknown) {
    const enviado = vi.fn();
    const response = { json: enviado } as never as { json: (cuerpo: unknown) => void };
    const next = vi.fn();

    ocultarCostosSinPermiso({ usuarioAutenticado } as never, response as never, next);
    response.json({ data: { nombre: "Vela", costo: "40" } });

    return { enviado, next };
  }

  it("a un operador le llega la respuesta sin costos", () => {
    const { enviado, next } = responder(operador);

    expect(next).toHaveBeenCalled();
    expect(enviado).toHaveBeenCalledWith({ data: { nombre: "Vela" } });
  });

  it("a un administrador le llega completa", () => {
    expect(responder(administrador).enviado).toHaveBeenCalledWith({ data: { nombre: "Vela", costo: "40" } });
  });
});

describe("rechazarCostoSinPermiso", () => {
  it("un operador no puede mandar costo, ni siquiera vacio", () => {
    const next = vi.fn();

    rechazarCostoSinPermiso({ usuarioAutenticado: operador, body: { nombre: "Vela", costo: 10 } } as never, {} as never, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorProhibido);
  });

  it("sin costo en el cuerpo, o siendo administrador, sigue", () => {
    const next = vi.fn();

    rechazarCostoSinPermiso({ usuarioAutenticado: operador, body: { nombre: "Vela" } } as never, {} as never, next);
    rechazarCostoSinPermiso({ usuarioAutenticado: administrador, body: { costo: 10 } } as never, {} as never, next);

    expect(next.mock.calls).toEqual([[], []]);
  });
});
