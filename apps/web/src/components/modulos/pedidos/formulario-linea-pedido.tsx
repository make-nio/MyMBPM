"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { formatearMoneda } from "../../../lib/formato";
import { ItemCatalogo } from "../../../types/items-catalogo";
import { PedidoDetalle } from "../../../types/pedidos";

type FormularioLineaPedidoProps = {
  items: ItemCatalogo[];
  linea?: PedidoDetalle | null;
  onCancel: () => void;
  onSubmit: (payload: { idItemCatalogo: string; cantidad: number }) => Promise<void>;
};

// Alta de una linea (item + cantidad) o edicion de su cantidad. El precio se toma del
// catalogo en el momento del alta (snapshot en la API).
export function FormularioLineaPedido({ items, linea, onCancel, onSubmit }: FormularioLineaPedidoProps) {
  const [idItemCatalogo, setIdItemCatalogo] = useState(linea?.idItemCatalogo ?? "");
  const [cantidad, setCantidad] = useState(linea ? String(Number(linea.cantidad)) : "1");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idItemCatalogo) {
      setError("Selecciona un item del catalogo");
      return;
    }

    if (!(Number(cantidad) > 0)) {
      setError("La cantidad tiene que ser mayor a cero");
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({ idItemCatalogo, cantidad: Number(cantidad) });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible guardar el item");
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      {linea ? (
        <p className="texto-secundario">{linea.nombreItemSnapshot}</p>
      ) : (
        <CampoSelect
          id="linea-item"
          label="Item"
          onChange={setIdItemCatalogo}
          options={[
            { label: "Selecciona un producto", value: "" },
            ...items.map((item) => ({
              label: `${item.nombre} (${formatearMoneda(item.precio)})`,
              value: item.idItemCatalogo
            }))
          ]}
          value={idItemCatalogo}
        />
      )}
      <CampoTexto
        id="linea-cantidad"
        label="Cantidad"
        onChange={setCantidad}
        required
        step="any"
        type="number"
        value={cantidad}
      />

      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Guardar item" />
    </form>
  );
}
