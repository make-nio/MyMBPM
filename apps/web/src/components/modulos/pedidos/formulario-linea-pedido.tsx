"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelectBuscable } from "../../formularios/campo-select-buscable";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { numeroMayorACero, requerido } from "../../../lib/validacion";
import { formatearMoneda } from "../../../lib/formato";
import { buscarItemsActivos } from "../../../lib/modulos/items-catalogo";
import { PedidoDetalle } from "../../../types/pedidos";

type FormularioLineaPedidoProps = {
  linea?: PedidoDetalle | null;
  onCancel: () => void;
  onSubmit: (payload: { idItemCatalogo: string; cantidad: number }) => Promise<void>;
};

// Alta de una linea (item + cantidad) o edicion de su cantidad. El precio se toma del
// catalogo en el momento del alta (snapshot en la API).
export function FormularioLineaPedido({ linea, onCancel, onSubmit }: FormularioLineaPedidoProps) {
  const [idItemCatalogo, setIdItemCatalogo] = useState(linea?.idItemCatalogo ?? "");
  const [cantidad, setCantidad] = useState(linea ? String(Number(linea.cantidad)) : "1");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      "linea-item": { valor: idItemCatalogo, reglas: [requerido("el item del catalogo: buscalo y elegilo de la lista")] },
      "linea-cantidad": { valor: cantidad, reglas: [requerido("la cantidad"), numeroMayorACero()] }
    });
    if (resumen) {
      setError(resumen);
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
    <form className="formulario-modulo" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}

      {linea ? (
        <p className="texto-secundario">{linea.nombreItemSnapshot}</p>
      ) : (
        <CampoSelectBuscable
          buscar={(texto, limit) =>
            buscarItemsActivos(texto, limit, "PRODUCTO").then((items) =>
              items.map((item) => ({
                label: `${item.nombre} (${formatearMoneda(item.precio)})`,
                value: item.idItemCatalogo
              }))
            )
          }
          error={errorDe("linea-item", idItemCatalogo)}
          id="linea-item"
          label="Item"
          onChange={setIdItemCatalogo}
          textoVacio="Selecciona un producto"
          value={idItemCatalogo}
        />
      )}
      <CampoTexto
        error={errorDe("linea-cantidad", cantidad)}
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
