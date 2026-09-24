"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { ItemCatalogo } from "../../../types/items-catalogo";
import { OrdenProduccionDetalle } from "../../../types/produccion";

type FormularioDetalleOrdenProps = {
  productos: ItemCatalogo[];
  detalle?: OrdenProduccionDetalle | null;
  onCancel: () => void;
  onSubmit: (payload: { idItemCatalogoProducto: string; cantidad: number; observaciones?: string }) => Promise<void>;
};

export function FormularioDetalleOrden({ productos, detalle, onCancel, onSubmit }: FormularioDetalleOrdenProps) {
  const [idItemCatalogoProducto, setIdProducto] = useState(detalle?.idItemCatalogoProducto ?? "");
  const [cantidad, setCantidad] = useState(detalle ? String(Number(detalle.cantidad)) : "1");
  const [observaciones, setObservaciones] = useState(detalle?.observaciones ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idItemCatalogoProducto) {
      setError("Selecciona el producto a fabricar");
      return;
    }

    if (!(Number(cantidad) > 0)) {
      setError("La cantidad tiene que ser mayor a cero");
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({ idItemCatalogoProducto, cantidad: Number(cantidad), observaciones: observaciones || undefined });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible guardar el producto");
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      {detalle ? (
        <p className="texto-secundario">{detalle.itemCatalogoProducto?.nombre ?? "Producto"}</p>
      ) : (
        <CampoSelect
          id="orden-producto"
          label="Producto a fabricar"
          onChange={setIdProducto}
          options={[
            { label: "Selecciona un producto", value: "" },
            ...productos.map((producto) => ({ label: producto.nombre, value: producto.idItemCatalogo }))
          ]}
          value={idItemCatalogoProducto}
        />
      )}
      <CampoTexto id="orden-cantidad" label="Cantidad" onChange={setCantidad} required step="any" type="number" value={cantidad} />
      <CampoTexto id="orden-observaciones" label="Observaciones" onChange={setObservaciones} value={observaciones} />

      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Guardar producto" />
    </form>
  );
}
