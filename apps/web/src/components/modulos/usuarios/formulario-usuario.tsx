"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoCheckbox } from "../../formularios/campo-checkbox";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { formatoEmail, largoMaximo, largoMinimo, requerido } from "../../../lib/validacion";
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
  const { formularioRef, validar, errorDelServidor, errorDe } = useValidacionFormulario();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      "usuario-nombre": { valor: nombre, reglas: [requerido("el nombre"), largoMaximo(100)] },
      "usuario-apellido": { valor: apellido, reglas: [requerido("el apellido"), largoMaximo(100)] },
      "usuario-email": { valor: email, reglas: [requerido("el email"), formatoEmail(), largoMaximo(150)] },
      "usuario-usuario": { valor: nombreUsuario, reglas: [requerido("el nombre de usuario (con el que va a ingresar)"), largoMaximo(100)] },
      "usuario-password": {
        valor: password,
        reglas: esAlta ? [requerido("la clave inicial"), largoMinimo(8, "La clave tiene que tener"), largoMaximo(100)] : []
      }
    });
    if (resumen) {
      setError(resumen);
      return;
    }

    setEnviando(true);
    setError(null);

    const datos = { nombre, apellido, email, usuario: nombreUsuario, esAdministrador };

    try {
      await onSubmit(esAlta ? { ...datos, password } : datos);
    } catch (currentError) {
      setError(
        errorDelServidor(currentError, {
          EMAIL: { id: "usuario-email", valor: email },
          USUARIO: { id: "usuario-usuario", valor: nombreUsuario }
        }) ??
          (currentError instanceof Error ? currentError.message : "No fue posible guardar el usuario")
      );
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoTexto error={errorDe("usuario-nombre", nombre)} id="usuario-nombre" label="Nombre" onChange={setNombre} required value={nombre} />
      <CampoTexto error={errorDe("usuario-apellido", apellido)} id="usuario-apellido" label="Apellido" onChange={setApellido} required value={apellido} />
      <CampoTexto error={errorDe("usuario-email", email)} id="usuario-email" label="Email" onChange={setEmail} required type="email" value={email} />
      <CampoTexto
        autoComplete="off"
        error={errorDe("usuario-usuario", nombreUsuario)}
        id="usuario-usuario"
        label="Usuario"
        onChange={setNombreUsuario}
        required
        value={nombreUsuario}
      />
      {esAlta ? (
        <CampoTexto
          autoComplete="new-password"
          error={errorDe("usuario-password", password)}
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
