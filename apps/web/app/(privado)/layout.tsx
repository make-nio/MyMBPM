"use client";

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
        <div className="panel-shell">
          <BarraLateralPrivada />

          <div className="contenido-privado">
            <EncabezadoPrivado onLogout={cerrarSesion} usuario={usuario} />
            <main className="contenido-principal">{children}</main>
          </div>
        </div>
      )}
    </GuardiaRutaPrivada>
  );
}
