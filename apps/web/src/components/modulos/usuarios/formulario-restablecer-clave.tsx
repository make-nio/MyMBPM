"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";

type FormularioRestablecerClaveProps = {
  onCancel: () => void;
  onSubmit: (passwordNueva: string) => Promise<void>;
};

export function FormularioRestablecerClave({ onCancel, onSubmit }: FormularioRestablecerClaveProps) {
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordNueva !== confirmacion) {
      setError("Las claves no coinciden");
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
    <form className="formulario-modulo" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoTexto
        autoComplete="new-password"
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
