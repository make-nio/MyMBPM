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
  },
  {
    href: "/pedidos",
    label: "Pedidos"
  },
  {
    href: "/produccion",
    label: "Produccion"
  },
  {
    href: "/stock",
    label: "Stock"
  }
];

// Solo para administradores: la API responde 403 al resto.
const accesosAdministracion = [
  {
    href: "/usuarios",
    label: "Usuarios"
  }
];

export function BarraLateralPrivada({
  esAdministrador,
  abierta = false
}: {
  esAdministrador: boolean;
  abierta?: boolean;
}) {
  const pathname = usePathname();
  const accesos = esAdministrador
    ? [...accesosPrincipales, ...accesosAdministracion]
    : accesosPrincipales;

  return (
    <aside className={abierta ? "barra-lateral barra-lateral--abierta" : "barra-lateral"} id="menu-principal">
      <div className="barra-lateral__marca">
        <p className="marca-pequena">Panel privado</p>
        <h1>MLM BPM</h1>
        <p>Gestion interna del emprendimiento.</p>
      </div>

      <nav aria-label="Menu principal" className="barra-lateral__navegacion">
        <section>
          <p className="barra-lateral__seccion-titulo">Modulos</p>
          <div className="barra-lateral__lista">
            {accesos.map((item) => (
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
      </nav>
    </aside>
  );
}
