import { describe, expect, it } from "vitest";

import { duracionSesionSegundos, inicioDelSegundo, tokenAnteriorAlCorte } from "./sesion";

describe("duracionSesionSegundos", () => {
  it("lee horas, minutos, dias y segundos", () => {
    expect(duracionSesionSegundos("8h")).toBe(8 * 3600);
    expect(duracionSesionSegundos("90m")).toBe(90 * 60);
    expect(duracionSesionSegundos("3600")).toBe(3600);
  });

  it("nunca pasa de 12 horas ni baja de un minuto", () => {
    expect(duracionSesionSegundos("30d")).toBe(12 * 3600);
    expect(duracionSesionSegundos("5s")).toBe(60);
  });

  it("sin valor o con uno invalido usa 8 horas", () => {
    expect(duracionSesionSegundos(undefined)).toBe(8 * 3600);
    expect(duracionSesionSegundos("una semana")).toBe(8 * 3600);
  });
});

describe("tokenAnteriorAlCorte", () => {
  const corte = inicioDelSegundo(new Date("2026-09-24T10:00:00.750Z"));

  it("sin corte vale cualquier token", () => {
    expect(tokenAnteriorAlCorte(1, null)).toBe(false);
  });

  it("rechaza los tokens emitidos antes del corte y acepta los del mismo segundo o despues", () => {
    const segundoDelCorte = Date.parse("2026-09-24T10:00:00Z") / 1000;
    expect(tokenAnteriorAlCorte(segundoDelCorte - 1, corte)).toBe(true);
    expect(tokenAnteriorAlCorte(segundoDelCorte, corte)).toBe(false);
    expect(tokenAnteriorAlCorte(segundoDelCorte + 60, corte)).toBe(false);
  });
});
