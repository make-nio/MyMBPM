import { describe, expect, it } from "vitest";

import { ErrorValidacion } from "../../compartido/errores/error-validacion";
import { validar } from "../../compartido/validaciones/validar";

import { crearAjusteStockSchema, historialStockQuerySchema } from "./stock.schemas";

const ajuste = {
  idItemCatalogo: "1",
  tipoStock: "INSUMO",
  tipoMovimiento: "AJUSTE_POSITIVO",
  cantidad: 5
};

function erroresDe(body: unknown) {
  try {
    validar(crearAjusteStockSchema, body);
    return null;
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorValidacion);
    return (error as ErrorValidacion).detalles as Array<{ path: string; message: string }>;
  }
}

describe("crearAjusteStockSchema: motivo obligatorio", () => {
  it.each([
    ["sin observaciones", ajuste],
    ["observaciones vacias", { ...ajuste, observaciones: "" }],
    ["solo espacios", { ...ajuste, observaciones: "   " }]
  ])("rechaza el ajuste %s", (_caso, body) => {
    expect(erroresDe(body)).toEqual([{ path: "observaciones", message: "Indica el motivo del ajuste" }]);
  });

  it("acepta el ajuste con motivo y lo guarda sin espacios sobrantes", () => {
    const datos = validar(crearAjusteStockSchema, { ...ajuste, observaciones: "  Compra de filamento " });

    expect(datos.observaciones).toBe("Compra de filamento");
  });

  it("sigue rechazando motivos de mas de 2000 caracteres", () => {
    expect(erroresDe({ ...ajuste, observaciones: "x".repeat(2001) })?.[0].path).toBe("observaciones");
  });
});

describe("historialStockQuerySchema", () => {
  it("acepta origen y referencia para filtrar los movimientos de un pedido u orden", () => {
    const query = historialStockQuerySchema.parse({
      idItemCatalogo: "3",
      origenMovimiento: "PRODUCCION",
      idReferenciaOrigen: "7"
    });

    expect(query).toMatchObject({ idItemCatalogo: 3n, origenMovimiento: "PRODUCCION", idReferenciaOrigen: 7n });
  });

  it("rechaza un origen que no existe", () => {
    expect(historialStockQuerySchema.safeParse({ idItemCatalogo: "3", origenMovimiento: "OTRO" }).success).toBe(false);
  });
});
