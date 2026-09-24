"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoCheckbox } from "../../formularios/campo-checkbox";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { Usuario, UsuarioAltaPayload, UsuarioEdicionPayload } from "../../../types/usuarios";

type FormularioUsuarioProps = {
  usuario?: Usuario | null;
  onCancel: () => void;
  onSubmit: (payload: UsuarioAltaPayload | UsuarioEdicionPayload) => Promise<void>;
};

// Alta y edicion de usuarios. La clave solo se pide en el alta; para cambiarla despues
// esta "Restablecer clave". El estado activo se cambia desde la tabla.
export function FormularioUsuario({ usuario, onCancel, onSubmit }: FormularioUsuarioProps) {
  const esAlta = !usuario;
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [apellido, setApellido] = useState(usuario?.apellido ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [nombreUsuario, setNombreUsuario] = useState(usuario?.usuario ?? "");
  const [password, setPassword] = useState("");
  const [esAdministrador, setEsAdministrador] = useState(usuario?.esAdministrador ?? false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    const datos = { nombre, apellido, email, usuario: nombreUsuario, esAdministrador };

    try {
      await onSubmit(esAlta ? { ...datos, password } : datos);
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "No fue posible guardar el usuario"
      );
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoTexto id="usuario-nombre" label="Nombre" onChange={setNombre} required value={nombre} />
      <CampoTexto id="usuario-apellido" label="Apellido" onChange={setApellido} required value={apellido} />
      <CampoTexto id="usuario-email" label="Email" onChange={setEmail} required type="email" value={email} />
      <CampoTexto
        autoComplete="off"
        id="usuario-usuario"
        label="Usuario"
        onChange={setNombreUsuario}
        required
        value={nombreUsuario}
      />
      {esAlta ? (
        <CampoTexto
          autoComplete="new-password"
          id="usuario-password"
          label="Clave inicial"
          minLength={8}
          onChange={setPassword}
          required
          type="password"
          value={password}
        />
      ) : null}
      <CampoCheckbox
        checked={esAdministrador}
        id="usuario-administrador"
        label="Administrador (puede gestionar usuarios)"
        onChange={setEsAdministrador}
      />

      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Guardar usuario" />
    </form>
  );
}
