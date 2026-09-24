"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { MensajeError } from "../../ui/mensaje-error";
import { formatearEstado } from "../../../lib/formato";
import { Cliente } from "../../../types/clientes";
import {
  ESTADOS_COBRO,
  EstadoCobro,
  ORIGENES_PEDIDO,
  OrigenPedido,
  PedidoAltaPayload
} from "../../../types/pedidos";

type FormularioPedidoProps = {
  clientes: Cliente[];
  onCancel: () => void;
  onSubmit: (payload: PedidoAltaPayload) => Promise<void>;
};

// Alta de la cabecera del pedido. Los items se agregan despues, desde el detalle.
export function FormularioPedido({ clientes, onCancel, onSubmit }: FormularioPedidoProps) {
  const [idCliente, setIdCliente] = useState("");
  const [origenPedido, setOrigenPedido] = useState<OrigenPedido>("MANUAL");
  const [estadoCobro, setEstadoCobro] = useState<EstadoCobro>("PENDIENTE");
  const [observacionesCliente, setObservacionesCliente] = useState("");
  const [observacionesInternas, setObservacionesInternas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idCliente) {
      setError("Selecciona un cliente");
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({
        idCliente,
        origenPedido,
        estadoCobro,
        observacionesCliente: observacionesCliente || undefined,
        observacionesInternas: observacionesInternas || undefined
      });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible crear el pedido");
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoSelect
        id="pedido-cliente"
        label="Cliente"
        onChange={setIdCliente}
        options={[
          { label: "Selecciona un cliente", value: "" },
          ...clientes.map((cliente) => ({
            label: `${cliente.nombre} ${cliente.apellido ?? ""}`.trim(),
            value: cliente.idCliente
          }))
        ]}
        value={idCliente}
      />
      <CampoSelect
        id="pedido-origen"
        label="Origen"
        onChange={(value) => setOrigenPedido(value as OrigenPedido)}
        options={ORIGENES_PEDIDO.map((origen) => ({ label: formatearEstado(origen), value: origen }))}
        value={origenPedido}
      />
      <CampoSelect
        id="pedido-cobro"
        label="Estado de cobro"
        onChange={(value) => setEstadoCobro(value as EstadoCobro)}
        options={ESTADOS_COBRO.map((estado) => ({ label: formatearEstado(estado), value: estado }))}
        value={estadoCobro}
      />
      <CampoTextarea
        id="pedido-observaciones-cliente"
        label="Observaciones del cliente"
        onChange={setObservacionesCliente}
        value={observacionesCliente}
      />
      <CampoTextarea
        id="pedido-observaciones-internas"
        label="Observaciones internas"
        onChange={setObservacionesInternas}
        value={observacionesInternas}
      />

      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Crear pedido" />
    </form>
  );
}
