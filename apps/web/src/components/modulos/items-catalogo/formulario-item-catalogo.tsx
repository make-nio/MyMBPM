"use client";

import { FormEvent, useEffect, useState } from "react";

import { Categoria } from "../../../types/categorias";
import { useUsuarioAutenticado } from "../../auth/contexto-sesion";
import { ItemCatalogo, TIPOS_ITEM } from "../../../types/items-catalogo";
import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoCheckbox } from "../../formularios/campo-checkbox";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { largoMaximo, numeroEntero, numeroNoNegativo, requerido } from "../../../lib/validacion";

type FormularioItemCatalogoProps = {
  categorias: Categoria[];
  item?: ItemCatalogo | null;
  onCancel: () => void;
  onSubmit: (payload: {
    idCategoria: string;
    tipoItem: (typeof TIPOS_ITEM)[number];
    nombre: string;
    slug: string;
    codigo?: string;
    descripcionCorta?: string;
    descripcionCompleta?: string;
    observacionesInternas?: string;
    precio?: number;
    costo?: number;
    tipoMaterial?: string;
    color?: string;
    imagenPrincipal?: string;
    stockMinimo?: number;
    activo?: boolean;
    publico?: boolean;
  }) => Promise<void>;
};

function toNumberOrUndefined(value: string) {
  if (!value) {
    return undefined;
  }

  return Number(value);
}

export function FormularioItemCatalogo({
  categorias,
  item,
  onCancel,
  onSubmit
}: FormularioItemCatalogoProps) {
  // El costo solo lo ven y lo cargan los administradores (la API tampoco lo manda ni lo acepta).
  const { esAdministrador } = useUsuarioAutenticado();
  const [idCategoria, setIdCategoria] = useState(item?.idCategoria ?? "");
  const [tipoItem, setTipoItem] = useState<(typeof TIPOS_ITEM)[number]>(item?.tipoItem ?? "PRODUCTO");
  const [nombre, setNombre] = useState(item?.nombre ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [codigo, setCodigo] = useState(item?.codigo ?? "");
  const [descripcionCorta, setDescripcionCorta] = useState(item?.descripcionCorta ?? "");
  const [descripcionCompleta, setDescripcionCompleta] = useState(item?.descripcionCompleta ?? "");
  const [observacionesInternas, setObservacionesInternas] = useState(item?.observacionesInternas ?? "");
  const [precio, setPrecio] = useState(item?.precio ?? "");
  const [costo, setCosto] = useState(item?.costo ?? "");
  const [tipoMaterial, setTipoMaterial] = useState(item?.tipoMaterial ?? "");
  const [color, setColor] = useState(item?.color ?? "");
  const [imagenPrincipal, setImagenPrincipal] = useState(item?.imagenPrincipal ?? "");
  const [stockMinimo, setStockMinimo] = useState(String(item?.stockMinimo ?? 0));
  const [activo, setActivo] = useState(item?.activo ?? true);
  const [publico, setPublico] = useState(item?.publico ?? false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDelServidor, errorDe } = useValidacionFormulario();

  useEffect(() => {
    if (item?.idCategoria) {
      setIdCategoria(item.idCategoria);
      return;
    }

    if (!idCategoria && categorias.length > 0) {
      setIdCategoria(categorias[0].idCategoria);
    }
  }, [categorias, idCategoria, item]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      "item-categoria": { valor: idCategoria, reglas: [requerido("la categoria: si no hay ninguna, crea una en Categorias")] },
      "item-nombre": { valor: nombre, reglas: [requerido("el nombre"), largoMaximo(150)] },
      "item-slug": { valor: slug, reglas: [requerido("el slug (el nombre en la direccion web, por ejemplo llavero-gato)"), largoMaximo(180)] },
      "item-codigo": { valor: codigo, reglas: [largoMaximo(80)] },
      "item-material": { valor: tipoMaterial, reglas: [largoMaximo(100)] },
      "item-color": { valor: color, reglas: [largoMaximo(100)] },
      "item-imagen": { valor: imagenPrincipal, reglas: [largoMaximo(500)] },
      "item-precio": { valor: precio, reglas: [numeroNoNegativo()] },
      "item-costo": { valor: costo, reglas: esAdministrador ? [numeroNoNegativo()] : [] },
      "item-stock-minimo": { valor: stockMinimo, reglas: [numeroNoNegativo(), numeroEntero()] },
      "item-descripcion-corta": { valor: descripcionCorta, reglas: [largoMaximo(300)] },
      "item-descripcion-completa": { valor: descripcionCompleta, reglas: [largoMaximo(4000)] },
      "item-observaciones": { valor: observacionesInternas, reglas: [largoMaximo(2000)] }
    });
    if (resumen) {
      setError(resumen);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({
        idCategoria,
        tipoItem,
        nombre,
        slug,
        codigo: codigo || undefined,
        descripcionCorta: descripcionCorta || undefined,
        descripcionCompleta: descripcionCompleta || undefined,
        observacionesInternas: observacionesInternas || undefined,
        precio: toNumberOrUndefined(precio),
        costo: esAdministrador ? toNumberOrUndefined(costo) : undefined,
        tipoMaterial: tipoMaterial || undefined,
        color: color || undefined,
        imagenPrincipal: imagenPrincipal || undefined,
        stockMinimo: toNumberOrUndefined(stockMinimo),
        activo,
        publico
      });
    } catch (currentError) {
      setError(
        errorDelServidor(currentError, { SLUG: { id: "item-slug", valor: slug } }) ??
          (currentError instanceof Error ? currentError.message : "No fue posible guardar el item")
      );
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo formulario-modulo--dos-columnas" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}

      <CampoSelect
        error={errorDe("item-categoria", idCategoria)}
        id="item-categoria"
        label="Categoria"
        onChange={setIdCategoria}
        options={[
          { label: "Selecciona una categoria", value: "" },
          ...categorias.map((categoria) => ({
            label: categoria.nombre,
            value: categoria.idCategoria
          }))
        ]}
        value={idCategoria}
      />
      <CampoSelect
        id="item-tipo"
        label="Tipo de item"
        onChange={(value) => setTipoItem(value as (typeof TIPOS_ITEM)[number])}
        options={TIPOS_ITEM.map((tipo) => ({ label: tipo, value: tipo }))}
        value={tipoItem}
      />
      <CampoTexto error={errorDe("item-nombre", nombre)} id="item-nombre" label="Nombre" onChange={setNombre} required value={nombre} />
      <CampoTexto error={errorDe("item-slug", slug)} id="item-slug" label="Slug" onChange={setSlug} required value={slug} />
      <CampoTexto error={errorDe("item-codigo", codigo)} id="item-codigo" label="Codigo" onChange={setCodigo} value={codigo} />
      <CampoTexto error={errorDe("item-material", tipoMaterial)} id="item-material" label="Tipo material" onChange={setTipoMaterial} value={tipoMaterial} />
      <CampoTexto error={errorDe("item-color", color)} id="item-color" label="Color" onChange={setColor} value={color} />
      <CampoTexto
        error={errorDe("item-imagen", imagenPrincipal)}
        id="item-imagen"
        label="Imagen principal"
        onChange={setImagenPrincipal}
        value={imagenPrincipal}
      />
      <CampoTexto error={errorDe("item-precio", precio)} id="item-precio" label="Precio" onChange={setPrecio} type="number" value={precio} />
      {esAdministrador ? (
        <CampoTexto error={errorDe("item-costo", costo)} id="item-costo" label="Costo" onChange={setCosto} type="number" value={costo} />
      ) : null}
      <CampoTexto
        error={errorDe("item-stock-minimo", stockMinimo)}
        id="item-stock-minimo"
        label="Stock minimo"
        onChange={setStockMinimo}
        type="number"
        value={stockMinimo}
      />
      <div className="formulario-modulo__col-span">
        <CampoTextarea
          error={errorDe("item-descripcion-corta", descripcionCorta)}
          id="item-descripcion-corta"
          label="Descripcion corta"
          onChange={setDescripcionCorta}
          value={descripcionCorta}
        />
      </div>
      <div className="formulario-modulo__col-span">
        <CampoTextarea
          error={errorDe("item-descripcion-completa", descripcionCompleta)}
          id="item-descripcion-completa"
          label="Descripcion completa"
          onChange={setDescripcionCompleta}
          rows={5}
          value={descripcionCompleta}
        />
      </div>
      <div className="formulario-modulo__col-span">
        <CampoTextarea
          error={errorDe("item-observaciones", observacionesInternas)}
          id="item-observaciones"
          label="Observaciones internas"
          onChange={setObservacionesInternas}
          value={observacionesInternas}
        />
      </div>
      <CampoCheckbox checked={activo} id="item-activo" label="Item activo" onChange={setActivo} />
      <CampoCheckbox checked={publico} id="item-publico" label="Visible en catalogo" onChange={setPublico} />

      <div className="formulario-modulo__col-span">
        <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Guardar item" />
      </div>
    </form>
  );
}
