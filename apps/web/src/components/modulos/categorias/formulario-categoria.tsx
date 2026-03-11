"use client";

import { FormEvent, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoCheckbox } from "../../formularios/campo-checkbox";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { Categoria } from "../../../types/categorias";

type FormularioCategoriaProps = {
  categoria?: Categoria | null;
  onCancel: () => void;
  onSubmit: (payload: {
    nombre: string;
    slug: string;
    descripcion?: string;
    activo?: boolean;
  }) => Promise<void>;
};

export function FormularioCategoria({
  categoria,
  onCancel,
  onSubmit
}: FormularioCategoriaProps) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [slug, setSlug] = useState(categoria?.slug ?? "");
  const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? "");
  const [activo, setActivo] = useState(categoria?.activo ?? true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      await onSubmit({
        nombre,
        slug,
        descripcion: descripcion || undefined,
        activo
      });
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "No fue posible guardar la categoria"
      );
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" onSubmit={handleSubmit}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoTexto id="categoria-nombre" label="Nombre" onChange={setNombre} required value={nombre} />
      <CampoTexto id="categoria-slug" label="Slug" onChange={setSlug} required value={slug} />
      <CampoTextarea
        id="categoria-descripcion"
        label="Descripcion"
        onChange={setDescripcion}
        value={descripcion}
      />
      <CampoCheckbox
        checked={activo}
        id="categoria-activo"
        label="Categoria activa"
        onChange={setActivo}
      />

      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Guardar categoria" />
    </form>
  );
}
