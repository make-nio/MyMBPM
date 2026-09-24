"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { igualA, largoMaximo, largoMinimo, requerido } from "../../../lib/validacion";

type FormularioRestablecerClaveProps = {
  onCancel: () => void;
  onSubmit: (passwordNueva: string) => Promise<void>;
};

export function FormularioRestablecerClave({ onCancel, onSubmit }: FormularioRestablecerClaveProps) {
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      "clave-nueva": { valor: passwordNueva, reglas: [requerido("la clave nueva"), largoMinimo(8, "La clave tiene que tener"), largoMaximo(100)] },
      "clave-confirmacion": { valor: confirmacion, reglas: [requerido("repetir la clave nueva"), igualA(passwordNueva, "No coincide con la clave nueva: escribila de nuevo igual.")] }
    });
    if (resumen) {
      setError(resumen);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit(passwordNueva);
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "No fue posible restablecer la clave"
      );
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoTexto
        autoComplete="new-password"
        error={errorDe("clave-nueva", passwordNueva)}
        id="clave-nueva"
        label="Clave nueva"
        minLength={8}
        onChange={setPasswordNueva}
        required
        type="password"
        value={passwordNueva}
      />
      <CampoTexto
        autoComplete="new-password"
        error={errorDe("clave-confirmacion", confirmacion)}
        id="clave-confirmacion"
        label="Repetir clave nueva"
        minLength={8}
        onChange={setConfirmacion}
        required
        type="password"
        value={confirmacion}
      />

      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Restablecer clave" />
    </form>
  );
}
