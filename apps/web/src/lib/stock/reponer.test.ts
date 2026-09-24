import { describe, expect, it } from "vitest";

import { cantidadParaReponer, leerOrdenParaReponer, rutaOrdenParaReponer } from "./reponer";

describe("cantidadParaReponer", () => {
  it("propone lo que falta para llegar al minimo", () => {
    expect(cantidadParaReponer("3", 10)).toBe(7);
    expect(cantidadParaReponer(0, 5)).toBe(5);
  });

  it("con stock negativo tambien cubre el faltante", () => {
    expect(cantidadParaReponer("-2", 5)).toBe(7);
  });

  it("redondea para arriba si el stock tiene decimales", () => {
    expect(cantidadParaReponer("2.5", 5)).toBe(3);
  });

  it("justo en el minimo propone 1", () => {
    expect(cantidadParaReponer("5", 5)).toBe(1);
  });
});

describe("ruta de la orden para reponer", () => {
  it("ida y vuelta", () => {
    const ruta = rutaOrdenParaReponer("42", 7);
    expect(ruta).toBe("/produccion?producir=42&cantidad=7");
    expect(leerOrdenParaReponer(ruta.split("?")[1])).toEqual({ idItemCatalogo: "42", cantidad: 7 });
  });

  it("ignora parametros faltantes o invalidos", () => {
    expect(leerOrdenParaReponer("")).toBeNull();
    expect(leerOrdenParaReponer("?producir=42")).toBeNull();
    expect(leerOrdenParaReponer("?producir=abc&cantidad=3")).toBeNull();
    expect(leerOrdenParaReponer("?producir=42&cantidad=0")).toBeNull();
    expect(leerOrdenParaReponer("?producir=42&cantidad=2.5")).toBeNull();
  });
});
