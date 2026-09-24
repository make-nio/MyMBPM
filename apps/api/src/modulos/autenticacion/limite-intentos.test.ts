import { describe, expect, it } from "vitest";

import { calcularBloqueo, LIMITE_INTENTOS, minutosRestantes } from "./limite-intentos";

const ahora = new Date("2026-09-24T12:00:00Z");
const haceMinutos = (minutos: number) => new Date(ahora.getTime() - minutos * 60_000);

describe("calcularBloqueo", () => {
  it("con menos fallidos que el maximo no bloquea", () => {
    expect(calcularBloqueo([haceMinutos(1), haceMinutos(2), haceMinutos(3), haceMinutos(4)], 5, ahora)).toBeNull();
  });

  it("5 fallidos dentro de 15 minutos bloquean 15 minutos desde el ultimo", () => {
    const fallidos = [haceMinutos(2), haceMinutos(4), haceMinutos(6), haceMinutos(8), haceMinutos(10)];

    expect(calcularBloqueo(fallidos, 5, ahora)).toEqual(new Date(haceMinutos(2).getTime() + LIMITE_INTENTOS.bloqueoMs));
  });

  it("si la racha tardo mas de 15 minutos no bloquea", () => {
    const fallidos = [haceMinutos(1), haceMinutos(5), haceMinutos(9), haceMinutos(13), haceMinutos(17)];

    expect(calcularBloqueo(fallidos, 5, ahora)).toBeNull();
  });

  it("el bloqueo vence 15 minutos despues del ultimo fallido", () => {
    const fallidos = [haceMinutos(16), haceMinutos(17), haceMinutos(18), haceMinutos(19), haceMinutos(20)];

    expect(calcularBloqueo(fallidos, 5, ahora)).toBeNull();
  });

  it("vencido el bloqueo, un fallido mas no vuelve a bloquear con los viejos", () => {
    const fallidos = [haceMinutos(0), haceMinutos(16), haceMinutos(17), haceMinutos(18), haceMinutos(19)];

    expect(calcularBloqueo(fallidos, 5, ahora)).toBeNull();
  });
});

describe("minutosRestantes", () => {
  it("redondea para arriba y nunca dice 0", () => {
    expect(minutosRestantes(new Date(ahora.getTime() + 61_000), ahora)).toBe(2);
    expect(minutosRestantes(new Date(ahora.getTime() + 1_000), ahora)).toBe(1);
  });
});
