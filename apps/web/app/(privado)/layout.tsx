"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ProveedorSesion } from "../../src/components/auth/contexto-sesion";
import { GuardiaRutaPrivada } from "../../src/components/auth/guardia-ruta-privada";
import { BarraLateralPrivada } from "../../src/components/layout/barra-lateral-privada";
import { EncabezadoPrivado } from "../../src/components/layout/encabezado-privado";

export default function PrivadoLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // En pantallas angostas el menu va plegado detras del boton "Menu" (ver globals.css).
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  return (
    <GuardiaRutaPrivada>
      {({ usuario, cerrarSesion }) => (
        <ProveedorSesion usuario={usuario}>
          <div className="panel-shell">
            <BarraLateralPrivada abierta={menuAbierto} esAdministrador={usuario.esAdministrador} />

            <div className="contenido-privado">
              <EncabezadoPrivado
                menuAbierto={menuAbierto}
                onAlternarMenu={() => setMenuAbierto((abierto) => !abierto)}
                onLogout={cerrarSesion}
                usuario={usuario}
              />
              <main className="contenido-principal">{children}</main>
            </div>
          </div>
        </ProveedorSesion>
      )}
    </GuardiaRutaPrivada>
  );
}
