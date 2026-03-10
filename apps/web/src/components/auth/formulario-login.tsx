"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { login, resolverSesionActual } from "../../lib/auth";

export function FormularioLogin() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function validarSesion() {
      const sesion = await resolverSesionActual();

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
    <form className="formulario-login" onSubmit={handleSubmit}>
      {error ? <div className="mensaje-error">{error}</div> : null}

      <div className="campo-formulario">
        <label htmlFor="identificador">Usuario o email</label>
        <input
          id="identificador"
          name="identificador"
          type="text"
          autoComplete="username"
          value={identificador}
          onChange={(event) => setIdentificador(event.target.value)}
          required
        />
      </div>

      <div className="campo-formulario">
        <label htmlFor="password">Clave</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      <button className="boton-primario" type="submit" disabled={enviando}>
        {enviando ? "Ingresando..." : "Ingresar al panel"}
      </button>
    </form>
  );
}
