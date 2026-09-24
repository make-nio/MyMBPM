"use client";

import { FormEvent, useState } from "react";

import { buscarItemsActivos } from "../../../lib/modulos/items-catalogo";
import { ItemCatalogo, ItemCatalogoComponente } from "../../../types/items-catalogo";
import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoCheckbox } from "../../formularios/campo-checkbox";
import { CampoSelectBuscable } from "../../formularios/campo-select-buscable";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";

type FormularioComponenteItemProps = {
  componente?: ItemCatalogoComponente | null;
  itemPadreId: string;
  onCancel: () => void;
  onSubmit: (payload: {
    idItemCatalogoHijo: string;
    cantidadRequerida: number;
    unidadMedida: string;
    activo?: boolean;
  }) => Promise<void>;
};

function opcionItem(item: ItemCatalogo) {
  return { label: `${item.nombre} (${item.tipoItem})`, value: item.idItemCatalogo };
}

export function FormularioComponenteItem({
  componente,
  itemPadreId,
  onCancel,
  onSubmit
}: FormularioComponenteItemProps) {
  const [idItemCatalogoHijo, setIdItemCatalogoHijo] = useState(componente?.idItemCatalogoHijo ?? "");
  const [cantidadRequerida, setCantidadRequerida] = useState(
    componente?.cantidadRequerida ?? "1"
  );
  const [unidadMedida, setUnidadMedida] = useState(componente?.unidadMedida ?? "UN");
  const [activo, setActivo] = useState(componente?.activo ?? true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idItemCatalogoHijo) {
      setError("Selecciona un item componente");
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({
        idItemCatalogoHijo,
        cantidadRequerida: Number(cantidadRequerida),
        unidadMedida,
        activo
      });
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "No fue posible guardar el componente"
      );
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoSelectBuscable
        buscar={(texto, limit) =>
          // Un item no puede ser componente de si mismo.
          buscarItemsActivos(texto, limit).then((items) =>
            items.filter((item) => item.idItemCatalogo !== itemPadreId).map(opcionItem)
          )
        }
        id="componente-item"
        label="Item componente"
        onChange={setIdItemCatalogoHijo}
        opcionInicial={componente?.itemCatalogoComponente ? opcionItem(componente.itemCatalogoComponente) : null}
        textoVacio="Selecciona un item componente"
        value={idItemCatalogoHijo}
      />
      <CampoTexto
        id="componente-cantidad"
        label="Cantidad requerida"
        onChange={setCantidadRequerida}
        type="number"
        value={cantidadRequerida}
      />
      <CampoTexto
        id="componente-unidad"
        label="Unidad de medida"
        onChange={setUnidadMedida}
        value={unidadMedida}
      />
      <CampoCheckbox
        checked={activo}
        id="componente-activo"
        label="Componente activo"
        onChange={setActivo}
      />

      <AccionesFormulario
        enviando={enviando}
        onCancel={onCancel}
        textoGuardar="Guardar componente"
      />
    </form>
  );
}
