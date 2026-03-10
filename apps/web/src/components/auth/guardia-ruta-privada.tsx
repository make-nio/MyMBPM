"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { limpiarSesion, resolverSesionActual } from "../../lib/auth";
import { UsuarioAutenticado } from "../../types/auth";

type GuardiaRutaPrivadaProps = {
  children: (context: {
    usuario: UsuarioAutenticado;
    cerrarSesion: () => void;
  }) => ReactNode;
};

export function GuardiaRutaPrivada({ children }: GuardiaRutaPrivadaProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);

  useEffect(() => {
    let mounted = true;

    async function validarSesion() {
      const sesion = await resolverSesionActual();

      if (!mounted) {
        return;
      }

      if (!sesion) {
        limpiarSesion();
        router.replace("/ingresar");
        return;
      }

      setUsuario(sesion.usuario);
      setCargando(false);
    }

    void validarSesion();

    return () => {
      mounted = false;
    };
  }, [router]);

  function cerrarSesion() {
    limpiarSesion();
    router.replace("/ingresar");
  }

  if (cargando || !usuario) {
    return (
      <div className="pantalla-cargando">
        <div className="tarjeta-acceso">
          <p className="marca-pequena">Panel privado</p>
          <h1 className="titulo-acceso">Validando sesion</h1>
          <p className="texto-secundario">
            Estamos comprobando tus credenciales antes de mostrar el contenido.
          </p>
        </div>
      </div>
    );
  }

  return <>{children({ usuario, cerrarSesion })}</>;
}
