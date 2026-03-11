"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  ItemCatalogo,
  ItemCatalogoComponente
} from "../../../types/items-catalogo";
import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoCheckbox } from "../../formularios/campo-checkbox";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";

type FormularioComponenteItemProps = {
  componente?: ItemCatalogoComponente | null;
  itemPadreId: string;
  itemsDisponibles: ItemCatalogo[];
  onCancel: () => void;
  onSubmit: (payload: {
    idItemCatalogoHijo: string;
    cantidadRequerida: number;
    unidadMedida: string;
    activo?: boolean;
  }) => Promise<void>;
};

export function FormularioComponenteItem({
  componente,
  itemPadreId,
  itemsDisponibles,
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
  const opcionesDisponibles = itemsDisponibles.filter(
    (item) => item.idItemCatalogo !== itemPadreId
  );

  useEffect(() => {
    if (componente?.idItemCatalogoHijo) {
      setIdItemCatalogoHijo(componente.idItemCatalogoHijo);
      return;
    }

    if (!idItemCatalogoHijo && opcionesDisponibles.length > 0) {
      setIdItemCatalogoHijo(opcionesDisponibles[0].idItemCatalogo);
    }
  }, [componente, idItemCatalogoHijo, opcionesDisponibles]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      <CampoSelect
        id="componente-item"
        label="Item componente"
        onChange={setIdItemCatalogoHijo}
        options={[
          { label: "Selecciona un item componente", value: "" },
          ...opcionesDisponibles.map((item) => ({
            label: `${item.nombre} (${item.tipoItem})`,
            value: item.idItemCatalogo
          }))
        ]}
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
