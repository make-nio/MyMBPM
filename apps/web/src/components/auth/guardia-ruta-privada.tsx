"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { RUTA_SESION_CERRADA } from "../../lib/api";
import { leerToken, limpiarSesion, resolverSesionActual } from "../../lib/auth";
import { UsuarioAutenticado } from "../../types/auth";

type GuardiaRutaPrivadaProps = {
  children: (context: {
    usuario: UsuarioAutenticado;
    cerrarSesion: () => void;
  }) => ReactNode;
  // Lo que se ve mientras se valida la sesion: solo el marco de la pantalla (menu, encabezado,
  // titulo), sin ningun dato. Sale en el HTML estatico, asi que se pinta antes de que cargue el JS.
  marco?: ReactNode;
};

export function GuardiaRutaPrivada({ children, marco }: GuardiaRutaPrivadaProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  // Sin sesion valida se redirige al ingreso sin dejar nada pintado, ni siquiera el marco.
  const [redirigiendo, setRedirigiendo] = useState(false);
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [errorConexion, setErrorConexion] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function validarSesion() {
      let sesion;
      // Si habia un token y la API lo rechaza, la sesion vencio o se cerro: se avisa al ingresar.
      const habiaToken = Boolean(leerToken());

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
        setRedirigiendo(true);
        router.replace(habiaToken ? RUTA_SESION_CERRADA : "/ingresar");
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

  if (redirigiendo) {
    return null;
  }

  if ((cargando || !usuario) && marco) {
    return <>{marco}</>;
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
