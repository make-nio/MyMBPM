"use client";

import { ProveedorSesion } from "../../src/components/auth/contexto-sesion";
import { GuardiaRutaPrivada } from "../../src/components/auth/guardia-ruta-privada";
import { BarraLateralPrivada } from "../../src/components/layout/barra-lateral-privada";
import { EncabezadoPrivado } from "../../src/components/layout/encabezado-privado";

export default function PrivadoLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GuardiaRutaPrivada>
      {({ usuario, cerrarSesion }) => (
        <ProveedorSesion usuario={usuario}>
          <div className="panel-shell">
            <BarraLateralPrivada esAdministrador={usuario.esAdministrador} />

            <div className="contenido-privado">
              <EncabezadoPrivado onLogout={cerrarSesion} usuario={usuario} />
              <main className="contenido-principal">{children}</main>
            </div>
          </div>
        </ProveedorSesion>
      )}
    </GuardiaRutaPrivada>
  );
}
