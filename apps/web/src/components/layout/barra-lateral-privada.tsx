"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const accesosPrincipales = [
  {
    href: "/panel",
    label: "Dashboard"
  },
  {
    href: "/categorias",
    label: "Categorias"
  },
  {
    href: "/clientes",
    label: "Clientes"
  },
  {
    href: "/solicitudes-especiales",
    label: "Solicitudes especiales"
  },
  {
    href: "/items-catalogo",
    label: "Items catalogo"
  }
];

const proximosModulos = [
  "Pedidos",
  "Produccion",
  "Stock",
  "Usuarios"
];

export function BarraLateralPrivada() {
  const pathname = usePathname();

  return (
    <aside className="barra-lateral">
      <div className="barra-lateral__marca">
        <p className="marca-pequena">Panel privado</p>
        <h1>MLM BPM</h1>
        <p>Gestion interna del emprendimiento.</p>
      </div>

      <nav className="barra-lateral__navegacion">
        <section>
          <p className="barra-lateral__seccion-titulo">Accesos iniciales</p>
          <div className="barra-lateral__lista">
            {accesosPrincipales.map((item) => (
              <Link
                className={
                  pathname === item.href
                    ? "barra-lateral__link barra-lateral__link--activo"
                    : "barra-lateral__link"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <p className="barra-lateral__seccion-titulo">Modulos siguientes</p>
          <div className="barra-lateral__lista">
            {proximosModulos.map((item) => (
              <span className="barra-lateral__placeholder" key={item}>
                {item}
              </span>
            ))}
          </div>
        </section>
      </nav>
    </aside>
  );
}
