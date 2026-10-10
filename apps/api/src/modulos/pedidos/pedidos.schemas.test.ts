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

describe("cambio de estado: motivo de cancelacion y fecha real de entrega (#99)", () => {
  it("la fecha real de entrega se convierte a las 00:00 de Argentina", () => {
    const datos = actualizarEstadoPedidoSchema.parse({ estadoPedido: "ENTREGADO", fechaEntregaReal: "2026-10-05" });

    expect(datos.fechaEntregaReal?.toISOString()).toBe("2026-10-05T03:00:00.000Z");
  });

  it("el motivo solo va al cancelar y la fecha real solo al entregar", () => {
    expect(actualizarEstadoPedidoSchema.safeParse({ estadoPedido: "LISTO", motivoCancelacion: "x" }).success).toBe(false);
    expect(actualizarEstadoPedidoSchema.safeParse({ estadoPedido: "CANCELADO", fechaEntregaReal: "2026-10-05" }).success).toBe(false);
    expect(actualizarEstadoPedidoSchema.safeParse({ estadoPedido: "CANCELADO", motivoCancelacion: "x" }).success).toBe(true);
  });

  it("rechaza una fecha real invalida y un motivo de mas de 500", () => {
    expect(actualizarEstadoPedidoSchema.safeParse({ estadoPedido: "ENTREGADO", fechaEntregaReal: "2026-02-30" }).success).toBe(false);
    expect(actualizarEstadoPedidoSchema.safeParse({ estadoPedido: "CANCELADO", motivoCancelacion: "x".repeat(501) }).success).toBe(false);
  });
});
