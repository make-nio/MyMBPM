"use client";

import { FormEvent, useState } from "react";

import { Cliente } from "../../../types/clientes";
import {
  ESTADOS_SOLICITUD,
  SolicitudEspecial
} from "../../../types/solicitudes-especiales";
import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";

type FormularioSolicitudEspecialProps = {
  clientes: Cliente[];
  solicitud?: SolicitudEspecial | null;
  onCancel: () => void;
  onSubmit: (payload: {
    idCliente?: string;
    nombreSolicitante: string;
    telefono?: string;
    email?: string;
    descripcion: string;
    estadoSolicitud?: (typeof ESTADOS_SOLICITUD)[number];
    observaciones?: string;
  }) => Promise<void>;
};

export function FormularioSolicitudEspecial({
  clientes,
  solicitud,
  onCancel,
  onSubmit
}: FormularioSolicitudEspecialProps) {
  const [idCliente, setIdCliente] = useState(solicitud?.idCliente ?? "");
  const [nombreSolicitante, setNombreSolicitante] = useState(solicitud?.nombreSolicitante ?? "");
  const [telefono, setTelefono] = useState(solicitud?.telefono ?? "");
  const [email, setEmail] = useState(solicitud?.email ?? "");
  const [descripcion, setDescripcion] = useState(solicitud?.descripcion ?? "");
  const [estadoSolicitud, setEstadoSolicitud] = useState(
    solicitud?.estadoSolicitud ?? ESTADOS_SOLICITUD[0]
  );
  const [observaciones, setObservaciones] = useState(solicitud?.observaciones ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      await onSubmit({
        idCliente: idCliente || undefined,
        nombreSolicitante,
        telefono: telefono || undefined,
        email: email || undefined,
        descripcion,
        estadoSolicitud,
        observaciones: observaciones || undefined
      });
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No fue posible guardar la solicitud especial"
      );
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo formulario-modulo--dos-columnas" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoSelect
        id="solicitud-cliente"
        label="Cliente asociado"
        onChange={setIdCliente}
        options={[
          { label: "Sin cliente asociado", value: "" },
          ...clientes.map((cliente) => ({
            label: `${cliente.nombre} ${cliente.apellido ?? ""}`.trim(),
            value: cliente.idCliente
          }))
        ]}
        value={idCliente}
      />
      <CampoTexto
        id="solicitud-nombre"
        label="Nombre solicitante"
        onChange={setNombreSolicitante}
        required
        value={nombreSolicitante}
      />
      <CampoTexto id="solicitud-telefono" label="Telefono" onChange={setTelefono} value={telefono} />
      <CampoTexto id="solicitud-email" label="Email" onChange={setEmail} type="email" value={email} />
      <CampoSelect
        id="solicitud-estado"
        label="Estado"
        onChange={(value) => setEstadoSolicitud(value as (typeof ESTADOS_SOLICITUD)[number])}
        options={ESTADOS_SOLICITUD.map((estado) => ({
          label: estado,
          value: estado
        }))}
        value={estadoSolicitud}
      />
      <div className="formulario-modulo__col-span">
        <CampoTextarea
          id="solicitud-descripcion"
          label="Descripcion"
          onChange={setDescripcion}
          rows={5}
          value={descripcion}
        />
      </div>
      <div className="formulario-modulo__col-span">
        <CampoTextarea
          id="solicitud-observaciones"
          label="Observaciones"
          onChange={setObservaciones}
          value={observaciones}
        />
      </div>

      <div className="formulario-modulo__col-span">
        <AccionesFormulario
          enviando={enviando}
          onCancel={onCancel}
          textoGuardar="Guardar solicitud"
        />
      </div>
    </form>
  );
}
