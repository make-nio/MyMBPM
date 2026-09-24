"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoSelectBuscable } from "../../formularios/campo-select-buscable";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { largoMaximo, requerido } from "../../../lib/validacion";
import { formatearEstado } from "../../../lib/formato";
import { buscarOpcionesClientes } from "../../../lib/modulos/clientes";
import {
  ESTADOS_COBRO,
  EstadoCobro,
  ORIGENES_PEDIDO,
  OrigenPedido,
  PedidoAltaPayload
} from "../../../types/pedidos";

type FormularioPedidoProps = {
  onCancel: () => void;
  onSubmit: (payload: PedidoAltaPayload) => Promise<void>;
};

// Alta de la cabecera del pedido. Los items se agregan despues, desde el detalle.
export function FormularioPedido({ onCancel, onSubmit }: FormularioPedidoProps) {
  const [idCliente, setIdCliente] = useState("");
  const [origenPedido, setOrigenPedido] = useState<OrigenPedido>("MANUAL");
  const [estadoCobro, setEstadoCobro] = useState<EstadoCobro>("PENDIENTE");
  const [observacionesCliente, setObservacionesCliente] = useState("");
  const [observacionesInternas, setObservacionesInternas] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      "pedido-cliente": { valor: idCliente, reglas: [requerido("el cliente: buscalo y elegilo de la lista")] },
      "pedido-observaciones-cliente": { valor: observacionesCliente, reglas: [largoMaximo(2000)] },
      "pedido-observaciones-internas": { valor: observacionesInternas, reglas: [largoMaximo(2000)] }
    });
    if (resumen) {
      setError(resumen);
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
        observacionesInternas: observacionesInternas || undefined,
        fechaEntrega: fechaEntrega || undefined
      });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible crear el pedido");
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoSelectBuscable
        buscar={buscarOpcionesClientes}
        error={errorDe("pedido-cliente", idCliente)}
        id="pedido-cliente"
        label="Cliente"
        onChange={setIdCliente}
        textoVacio="Selecciona un cliente"
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
      <CampoTexto
        error={errorDe("pedido-fecha-entrega", fechaEntrega)}
        id="pedido-fecha-entrega"
        label="Entrega prometida (opcional)"
        onChange={setFechaEntrega}
        type="date"
        value={fechaEntrega}
      />
      <CampoTextarea
        error={errorDe("pedido-observaciones-cliente", observacionesCliente)}
        id="pedido-observaciones-cliente"
        label="Observaciones del cliente"
        onChange={setObservacionesCliente}
        value={observacionesCliente}
      />
      <CampoTextarea
        error={errorDe("pedido-observaciones-internas", observacionesInternas)}
        id="pedido-observaciones-internas"
        label="Observaciones internas"
        onChange={setObservacionesInternas}
        value={observacionesInternas}
      />

      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Crear pedido" />
    </form>
  );
}
