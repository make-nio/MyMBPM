import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { calcularVentas, rangoMesArgentina } from "./ventas-mes";

const dec = (valor: number | string) => new Prisma.Decimal(valor);

describe("rangoMesArgentina", () => {
  it("toma el mes de Argentina, no el de UTC", () => {
    // 1 de octubre 01:00 UTC = 30 de septiembre 22:00 en Argentina.
    expect(rangoMesArgentina(new Date("2026-10-01T01:00:00Z"))).toEqual({
      desde: new Date("2026-09-01T03:00:00Z"),
      hasta: new Date("2026-10-01T03:00:00Z")
    });
  });

  it("diciembre termina en enero del año siguiente", () => {
    expect(rangoMesArgentina(new Date("2026-12-15T12:00:00Z")).hasta).toEqual(new Date("2027-01-01T03:00:00Z"));
  });
});

describe("calcularVentas", () => {
  it("vendido, costo por linea (costo x cantidad) y ganancia", () => {
    const resumen = calcularVentas([
      { total: dec("2376"), detalles: [{ cantidad: dec(2), costoUnitario: dec("400.25") }, { cantidad: dec("1.5"), costoUnitario: dec(100) }] },
      { total: dec(500), detalles: [{ cantidad: dec(1), costoUnitario: dec(0) }] }
    ]);

    expect(resumen.pedidos).toBe(2);
    expect(resumen.vendido.toString()).toBe("2876");
    expect(resumen.costo.toString()).toBe("950.5");
    expect(resumen.ganancia.toString()).toBe("1925.5");
    expect(resumen.lineasSinCosto).toBe(1);
  });

  it("sin pedidos todo en cero", () => {
    expect(calcularVentas([])).toMatchObject({ pedidos: 0, lineasSinCosto: 0 });
  });
});
