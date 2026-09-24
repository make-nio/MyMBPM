import { AvisosPanel } from "../types/panel";

// Lo que muestra la campanita del encabezado: solo lo que tiene algo, cada uno con su pantalla.
type Aviso = { clave: string; cantidad: number; texto: string; href: string };

export function listarAvisos(avisos: AvisosPanel): Aviso[] {
  const plural = (cantidad: number, uno: string, varios: string) => (cantidad === 1 ? uno : varios);

  return [
    {
      clave: "stock",
      cantidad: avisos.stockBajo,
      texto: plural(avisos.stockBajo, "item bajo el minimo", "items bajo el minimo"),
      href: "/stock?bajoMinimo=1"
    },
    {
      clave: "atrasadas",
      cantidad: avisos.entregasAtrasadas,
      texto: plural(avisos.entregasAtrasadas, "entrega atrasada", "entregas atrasadas"),
      href: "/panel"
    },
    {
      clave: "hoy",
      cantidad: avisos.entregasHoy,
      texto: plural(avisos.entregasHoy, "entrega para hoy", "entregas para hoy"),
      href: "/panel"
    }
  ].filter((aviso) => aviso.cantidad > 0);
}
