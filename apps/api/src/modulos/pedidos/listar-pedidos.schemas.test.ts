import { describe, expect, it } from "vitest";

import { listarPedidosQuerySchema } from "./pedidos.schemas";

describe("listarPedidosQuerySchema: rango de fechas de alta", () => {
  it("toma desde a las 00:00 de Argentina y hasta como el dia siguiente, para incluirlo", () => {
    const filtros = listarPedidosQuerySchema.parse({ desde: "2026-09-01", hasta: "2026-09-30" });

    expect(filtros.desde?.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(filtros.hasta?.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });

  it("acepta el mismo dia en desde y hasta", () => {
    expect(listarPedidosQuerySchema.safeParse({ desde: "2026-09-24", hasta: "2026-09-24" }).success).toBe(true);
  });

  it("rechaza dias invalidos y un rango invertido", () => {
    expect(listarPedidosQuerySchema.safeParse({ desde: "2026-02-30" }).success).toBe(false);
    expect(listarPedidosQuerySchema.safeParse({ desde: "2026-09-30", hasta: "2026-09-01" }).success).toBe(false);
  });
});
