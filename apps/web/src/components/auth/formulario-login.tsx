"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useValidacionFormulario } from "../../hooks/use-validacion-formulario";
import { login, resolverSesionActual } from "../../lib/auth";
import { requerido } from "../../lib/validacion";
import { CampoTexto } from "../formularios/campo-texto";
import { MensajeError } from "../ui/mensaje-error";

// Las claves tienen al menos 8 caracteres: una mas corta esta mal escrita.
function claveCompleta(valor: string) {
  return valor && valor.length < 8 ? "Las claves tienen al menos 8 caracteres: revisa que la escribiste completa." : null;
}

export function FormularioLogin() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [sesionCerrada, setSesionCerrada] = useState(false);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();

  useEffect(() => {
    setSesionCerrada(new URLSearchParams(window.location.search).get("sesion") === "cerrada");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function validarSesion() {
      // Si no se puede verificar un token guardado, se muestra el formulario igual.
      const sesion = await resolverSesionActual().catch(() => null);

      if (!mounted) {
        return;
      }

      if (sesion) {
        router.replace("/panel");
        return;
      }

      setCargando(false);
    }

    void validarSesion();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      identificador: { valor: identificador, reglas: [requerido("el usuario o el email")] },
      password: { valor: password, reglas: [requerido("la clave"), claveCompleta] }
    });
    if (resumen) {
      setError(resumen);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await login({
        identificador,
        password
      });

      router.replace("/panel");
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No fue posible iniciar sesion"
      );
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="texto-secundario">
        Estamos revisando si ya existe una sesion activa.
      </div>
    );
  }

  return (
    <form className="formulario-login" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {sesionCerrada && !error ? (
        <p className="texto-secundario" role="status">
          Tu sesion vencio o se cerro. Ingresa de nuevo.
        </p>
      ) : null}
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoTexto
        autoComplete="username"
        error={errorDe("identificador", identificador)}
        id="identificador"
        label="Usuario o email"
        onChange={setIdentificador}
        required
        value={identificador}
      />

      <CampoTexto
        autoComplete="current-password"
        error={errorDe("password", password)}
        id="password"
        label="Clave"
        onChange={setPassword}
        required
        type="password"
        value={password}
      />

      <button className="boton-primario" type="submit" disabled={enviando}>
        {enviando ? "Ingresando..." : "Ingresar al panel"}
      </button>
    </form>
  );
}
