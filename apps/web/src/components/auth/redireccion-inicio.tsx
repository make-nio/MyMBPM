"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { resolverSesionActual } from "../../lib/auth";

export function RedireccionInicio() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function resolver() {
      const sesion = await resolverSesionActual();

      if (!mounted) {
        return;
      }

      router.replace(sesion ? "/panel" : "/ingresar");
    }

    void resolver();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="pantalla-cargando">
      <div className="tarjeta-acceso">
        <p className="marca-pequena">MLM BPM</p>
        <h1 className="titulo-acceso">Preparando acceso</h1>
        <p className="texto-secundario">
          Te estamos redirigiendo al panel o a la pantalla de ingreso.
        </p>
      </div>
    </div>
  );
}
