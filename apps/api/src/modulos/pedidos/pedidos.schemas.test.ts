import { describe, expect, it } from "vitest";

import { actualizarEstadoPedidoSchema, crearPedidoSchema } from "./pedidos.schemas";

describe("fecha de entrega prometida en los schemas de pedidos", () => {
  it("convierte el dia a las 00:00 de Argentina", () => {
    const datos = crearPedidoSchema.parse({ idCliente: "1", origenPedido: "MANUAL", fechaEntrega: "2026-09-30" });

    expect(datos.fechaEntrega?.toISOString()).toBe("2026-09-30T03:00:00.000Z");
  });

  it("es opcional al crear", () => {
    expect(crearPedidoSchema.parse({ idCliente: "1", origenPedido: "MANUAL" }).fechaEntrega).toBeUndefined();
  });

  it("acepta null para borrarla", () => {
    expect(actualizarEstadoPedidoSchema.parse({ fechaEntrega: null })).toEqual({ fechaEntrega: null });
  });

  it("rechaza dias invalidos", () => {
    expect(actualizarEstadoPedidoSchema.safeParse({ fechaEntrega: "2026-02-30" }).success).toBe(false);
    expect(actualizarEstadoPedidoSchema.safeParse({ fechaEntrega: "30/09/2026" }).success).toBe(false);
  });
});
