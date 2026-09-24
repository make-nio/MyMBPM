"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { formatearCantidad } from "../../../lib/formato";
import { Existencia, TipoAjuste } from "../../../types/stock";

type FormularioAjusteStockProps = {
  existencia: Existencia;
  onCancel: () => void;
  onSubmit: (payload: { tipoMovimiento: TipoAjuste; cantidad: number; observaciones: string }) => Promise<void>;
};

// Ajuste manual (conteo, rotura, compra de insumos). Pide el motivo para que el historial
// explique cada correccion.
export function FormularioAjusteStock({ existencia, onCancel, onSubmit }: FormularioAjusteStockProps) {
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoAjuste>("AJUSTE_POSITIVO");
  const [cantidad, setCantidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actual = Number(existencia.stockActual);
  const valor = Number(cantidad);
  const resultante = Math.round((tipoMovimiento === "AJUSTE_POSITIVO" ? actual + valor : actual - valor) * 1000) / 1000 + 0;
  const insuficiente = tipoMovimiento === "AJUSTE_NEGATIVO" && valor > 0 && resultante < 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!(valor > 0)) {
      setError("La cantidad tiene que ser mayor a cero");
      return;
    }

    if (!observaciones.trim()) {
      setError("Indica el motivo del ajuste");
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({ tipoMovimiento, cantidad: valor, observaciones: observaciones.trim() });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible registrar el ajuste");
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      <p className="texto-secundario">
        Stock actual de {existencia.nombre}: <strong>{formatearCantidad(existencia.stockActual)}</strong>
      </p>
      <CampoSelect
        id="ajuste-tipo"
        label="Tipo de ajuste"
        onChange={(value) => setTipoMovimiento(value as TipoAjuste)}
        options={[
          { label: "Ingreso (suma)", value: "AJUSTE_POSITIVO" },
          { label: "Egreso (resta)", value: "AJUSTE_NEGATIVO" }
        ]}
        value={tipoMovimiento}
      />
      <CampoTexto id="ajuste-cantidad" label="Cantidad" onChange={setCantidad} required step="any" type="number" value={cantidad} />
      <CampoTextarea id="ajuste-motivo" label="Motivo" onChange={setObservaciones} value={observaciones} />
      {valor > 0 ? (
        <p className="texto-secundario" data-testid="ajuste-resultante">
          Stock resultante: <strong>{formatearCantidad(resultante)}</strong>
        </p>
      ) : null}
      {insuficiente ? <MensajeError mensaje="No hay stock suficiente para ese egreso." /> : null}

      <AccionesFormulario
        deshabilitado={insuficiente}
        enviando={enviando}
        onCancel={onCancel}
        textoGuardar="Registrar ajuste"
      />
    </form>
  );
}
