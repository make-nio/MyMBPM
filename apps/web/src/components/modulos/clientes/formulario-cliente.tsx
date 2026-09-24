"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoCheckbox } from "../../formularios/campo-checkbox";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { formatoEmail, largoMaximo, requerido } from "../../../lib/validacion";
import { Cliente } from "../../../types/clientes";

type FormularioClienteProps = {
  cliente?: Cliente | null;
  onCancel: () => void;
  onSubmit: (payload: {
    nombre: string;
    apellido?: string;
    documento?: string;
    telefono?: string;
    email?: string;
    instagram?: string;
    domicilio?: string;
    localidad?: string;
    provincia?: string;
    observaciones?: string;
    activo?: boolean;
  }) => Promise<void>;
};

export function FormularioCliente({
  cliente,
  onCancel,
  onSubmit
}: FormularioClienteProps) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [apellido, setApellido] = useState(cliente?.apellido ?? "");
  const [documento, setDocumento] = useState(cliente?.documento ?? "");
  const [telefono, setTelefono] = useState(cliente?.telefono ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [instagram, setInstagram] = useState(cliente?.instagram ?? "");
  const [domicilio, setDomicilio] = useState(cliente?.domicilio ?? "");
  const [localidad, setLocalidad] = useState(cliente?.localidad ?? "");
  const [provincia, setProvincia] = useState(cliente?.provincia ?? "");
  const [observaciones, setObservaciones] = useState(cliente?.observaciones ?? "");
  const [activo, setActivo] = useState(cliente?.activo ?? true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      "cliente-nombre": { valor: nombre, reglas: [requerido("el nombre"), largoMaximo(120)] },
      "cliente-apellido": { valor: apellido, reglas: [largoMaximo(120)] },
      "cliente-documento": { valor: documento, reglas: [largoMaximo(30)] },
      "cliente-telefono": { valor: telefono, reglas: [largoMaximo(50)] },
      "cliente-email": { valor: email, reglas: [formatoEmail(), largoMaximo(150)] },
      "cliente-instagram": { valor: instagram, reglas: [largoMaximo(150)] },
      "cliente-domicilio": { valor: domicilio, reglas: [largoMaximo(250)] },
      "cliente-localidad": { valor: localidad, reglas: [largoMaximo(120)] },
      "cliente-provincia": { valor: provincia, reglas: [largoMaximo(120)] },
      "cliente-observaciones": { valor: observaciones, reglas: [largoMaximo(2000)] }
    });
    if (resumen) {
      setError(resumen);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({
        nombre,
        apellido: apellido || undefined,
        documento: documento || undefined,
        telefono: telefono || undefined,
        email: email || undefined,
        instagram: instagram || undefined,
        domicilio: domicilio || undefined,
        localidad: localidad || undefined,
        provincia: provincia || undefined,
        observaciones: observaciones || undefined,
        activo
      });
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "No fue posible guardar el cliente"
      );
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo formulario-modulo--dos-columnas" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoTexto error={errorDe("cliente-nombre", nombre)} id="cliente-nombre" label="Nombre" onChange={setNombre} required value={nombre} />
      <CampoTexto error={errorDe("cliente-apellido", apellido)} id="cliente-apellido" label="Apellido" onChange={setApellido} value={apellido} />
      <CampoTexto error={errorDe("cliente-documento", documento)} id="cliente-documento" label="Documento" onChange={setDocumento} value={documento} />
      <CampoTexto error={errorDe("cliente-telefono", telefono)} id="cliente-telefono" label="Telefono" onChange={setTelefono} value={telefono} />
      <CampoTexto error={errorDe("cliente-email", email)} id="cliente-email" label="Email" onChange={setEmail} type="email" value={email} />
      <CampoTexto error={errorDe("cliente-instagram", instagram)} id="cliente-instagram" label="Instagram" onChange={setInstagram} value={instagram} />
      <CampoTexto error={errorDe("cliente-domicilio", domicilio)} id="cliente-domicilio" label="Domicilio" onChange={setDomicilio} value={domicilio} />
      <CampoTexto error={errorDe("cliente-localidad", localidad)} id="cliente-localidad" label="Localidad" onChange={setLocalidad} value={localidad} />
      <CampoTexto error={errorDe("cliente-provincia", provincia)} id="cliente-provincia" label="Provincia" onChange={setProvincia} value={provincia} />
      <div className="formulario-modulo__col-span">
        <CampoTextarea
          error={errorDe("cliente-observaciones", observaciones)}
          id="cliente-observaciones"
          label="Observaciones"
          onChange={setObservaciones}
          value={observaciones}
        />
      </div>
      <div className="formulario-modulo__col-span">
        <CampoCheckbox checked={activo} id="cliente-activo" label="Cliente activo" onChange={setActivo} />
      </div>

      <div className="formulario-modulo__col-span">
        <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Guardar cliente" />
      </div>
    </form>
  );
}
