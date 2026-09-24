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
  const [errorConexion, setErrorConexion] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function validarSesion() {
      let sesion;

      try {
        sesion = await resolverSesionActual();
      } catch {
        // No se pudo verificar (red, recarga en curso, error del servidor): se conserva la sesion.
        if (mounted) {
          setErrorConexion(true);
        }
        return;
      }

      if (!mounted) {
        return;
      }

      if (!sesion) {
        router.replace("/ingresar");
        return;
      }

      setErrorConexion(false);
      setUsuario(sesion.usuario);
      setCargando(false);
    }

    void validarSesion();

    return () => {
      mounted = false;
    };
  }, [router, intento]);

  function cerrarSesion() {
    limpiarSesion();
    router.replace("/ingresar");
  }

  if (errorConexion) {
    return (
      <div className="pantalla-cargando">
        <div className="tarjeta-acceso">
          <p className="marca-pequena">Panel privado</p>
          <h1 className="titulo-acceso">No se pudo verificar la sesion</h1>
          <p className="texto-secundario">Revisa la conexion y volve a intentar. Tu sesion sigue abierta.</p>
          <button
            className="boton-primario"
            onClick={() => {
              setErrorConexion(false);
              setIntento((valor) => valor + 1);
            }}
            type="button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
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
