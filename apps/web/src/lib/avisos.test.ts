import { describe, expect, it } from "vitest";

import { listarAvisos } from "./avisos";

describe("listarAvisos", () => {
  it("sin nada pendiente no muestra avisos", () => {
    expect(listarAvisos({ stockBajo: 0, entregasAtrasadas: 0, entregasHoy: 0 })).toEqual([]);
  });

  it("muestra solo lo que tiene algo, con singular y plural y su pantalla", () => {
    expect(listarAvisos({ stockBajo: 3, entregasAtrasadas: 0, entregasHoy: 1 })).toEqual([
      { clave: "stock", cantidad: 3, texto: "items bajo el minimo", href: "/stock?bajoMinimo=1" },
      { clave: "hoy", cantidad: 1, texto: "entrega para hoy", href: "/panel" }
    ]);
    expect(listarAvisos({ stockBajo: 1, entregasAtrasadas: 2, entregasHoy: 0 }).map((aviso) => aviso.texto)).toEqual([
      "item bajo el minimo",
      "entregas atrasadas"
    ]);
  });
});
