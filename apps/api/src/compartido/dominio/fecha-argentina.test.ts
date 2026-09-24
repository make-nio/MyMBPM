import { describe, expect, it } from "vitest";

import { diaArgentinaAFecha, inicioDelDiaArgentina, sumarDias } from "./fecha-argentina";

describe("inicioDelDiaArgentina", () => {
  it("devuelve las 00:00 de Argentina (03:00 UTC) del mismo dia", () => {
    expect(inicioDelDiaArgentina(new Date("2026-09-24T15:00:00Z")).toISOString()).toBe("2026-09-24T03:00:00.000Z");
  });

  it("antes de las 03:00 UTC todavia es el dia anterior en Argentina", () => {
    expect(inicioDelDiaArgentina(new Date("2026-09-24T02:30:00Z")).toISOString()).toBe("2026-09-23T03:00:00.000Z");
  });
});

describe("sumarDias", () => {
  it("suma dias enteros", () => {
    expect(sumarDias(new Date("2026-09-24T03:00:00Z"), 7).toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
});

describe("diaArgentinaAFecha", () => {
  it("convierte un dia a las 00:00 de Argentina", () => {
    expect(diaArgentinaAFecha("2026-09-30")?.toISOString()).toBe("2026-09-30T03:00:00.000Z");
  });

  it("rechaza formatos y dias inexistentes", () => {
    expect(diaArgentinaAFecha("30/09/2026")).toBeNull();
    expect(diaArgentinaAFecha("2026-02-30")).toBeNull();
    expect(diaArgentinaAFecha("2026-13-01")).toBeNull();
  });
});
