import { describe, expect, it } from "vitest";

import { actualizarClienteSchema, crearClienteSchema, listarClientesQuerySchema } from "./clientes.schemas";

// Tipo de cliente (#100).
describe("segmento en los schemas de clientes", () => {
  it("es opcional al crear: sin segmento, la base pone CONSUMIDOR", () => {
    expect(crearClienteSchema.parse({ nombre: "Ana" }).segmento).toBeUndefined();
  });

  it.each(["CONSUMIDOR", "COMERCIO", "REVENDEDOR"] as const)("acepta %s al crear y al editar", (segmento) => {
    expect(crearClienteSchema.parse({ nombre: "Ana", segmento }).segmento).toBe(segmento);
    expect(actualizarClienteSchema.parse({ segmento }).segmento).toBe(segmento);
  });

  it("un valor fuera de la lista no pasa (400)", () => {
    expect(crearClienteSchema.safeParse({ nombre: "Ana", segmento: "MAYORISTA" }).success).toBe(false);
    expect(actualizarClienteSchema.safeParse({ segmento: "comercio" }).success).toBe(false);
    expect(listarClientesQuerySchema.safeParse({ segmento: "OTRO" }).success).toBe(false);
  });

  it("la lista filtra por segmento", () => {
    expect(listarClientesQuerySchema.parse({ segmento: "COMERCIO" }).segmento).toBe("COMERCIO");
  });
});
