"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelectBuscable } from "../../formularios/campo-select-buscable";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { largoMaximo, numeroMayorACero, requerido } from "../../../lib/validacion";
import { buscarItemsActivos } from "../../../lib/modulos/items-catalogo";
import { OrdenProduccionDetalle } from "../../../types/produccion";

type FormularioDetalleOrdenProps = {
  detalle?: OrdenProduccionDetalle | null;
  onCancel: () => void;
  onSubmit: (payload: { idItemCatalogoProducto: string; cantidad: number; observaciones?: string }) => Promise<void>;
};

export function FormularioDetalleOrden({ detalle, onCancel, onSubmit }: FormularioDetalleOrdenProps) {
  const [idItemCatalogoProducto, setIdProducto] = useState(detalle?.idItemCatalogoProducto ?? "");
  const [cantidad, setCantidad] = useState(detalle ? String(Number(detalle.cantidad)) : "1");
  const [observaciones, setObservaciones] = useState(detalle?.observaciones ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      "orden-producto": { valor: idItemCatalogoProducto, reglas: [requerido("el producto a fabricar: buscalo y elegilo de la lista")] },
      "orden-cantidad": { valor: cantidad, reglas: [requerido("la cantidad"), numeroMayorACero()] },
      "orden-observaciones": { valor: observaciones, reglas: [largoMaximo(2000)] }
    });
    if (resumen) {
      setError(resumen);
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
    <form className="formulario-modulo" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}

      {detalle ? (
        <p className="texto-secundario">{detalle.itemCatalogoProducto?.nombre ?? "Producto"}</p>
      ) : (
        <CampoSelectBuscable
          buscar={(texto, limit) =>
            buscarItemsActivos(texto, limit, "PRODUCTO").then((productos) =>
              productos.map((producto) => ({ label: producto.nombre, value: producto.idItemCatalogo }))
            )
          }
          error={errorDe("orden-producto", idItemCatalogoProducto)}
          id="orden-producto"
          label="Producto a fabricar"
          onChange={setIdProducto}
          textoVacio="Selecciona un producto"
          value={idItemCatalogoProducto}
        />
      )}
      <CampoTexto error={errorDe("orden-cantidad", cantidad)} id="orden-cantidad" label="Cantidad" onChange={setCantidad} required step="any" type="number" value={cantidad} />
      <CampoTexto error={errorDe("orden-observaciones", observaciones)} id="orden-observaciones" label="Observaciones" onChange={setObservaciones} value={observaciones} />

      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Guardar producto" />
    </form>
  );
}
