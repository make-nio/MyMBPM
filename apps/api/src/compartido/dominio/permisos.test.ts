import { describe, expect, it } from "vitest";

import { puedeVerCostos } from "./permisos";

describe("puedeVerCostos", () => {
  it("solo los administradores", () => {
    expect(puedeVerCostos({ esAdministrador: true })).toBe(true);
    expect(puedeVerCostos({ esAdministrador: false })).toBe(false);
    expect(puedeVerCostos(undefined)).toBe(false);
  });
});
