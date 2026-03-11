import { Categoria } from "./categorias";

export const TIPOS_ITEM = ["PRODUCTO", "INSUMO"] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

export type ItemCatalogoImagen = {
  idItemCatalogoImagen: string;
  idItemCatalogo: string;
  urlImagen: string;
  orden: number;
  activo: boolean;
  fechaAlta: string;
};

export type ItemCatalogo = {
  idItemCatalogo: string;
  idCategoria: string;
  tipoItem: TipoItem;
  nombre: string;
  slug: string;
  codigo: string | null;
  descripcionCorta: string | null;
  descripcionCompleta: string | null;
  observacionesInternas: string | null;
  precio: string | null;
  costo: string | null;
  tipoMaterial: string | null;
  color: string | null;
  imagenPrincipal: string | null;
  stockMinimo: number;
  activo: boolean;
  publico: boolean;
  fechaAlta: string;
  fechaModificacion: string;
  categoria?: Categoria | null;
  imagenes?: ItemCatalogoImagen[];
};

export type ItemCatalogoPayload = {
  idCategoria: string;
  tipoItem: TipoItem;
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
};

export type ItemCatalogoComponente = {
  idItemCatalogoComponente: string;
  idItemCatalogoPadre: string;
  idItemCatalogoHijo: string;
  cantidadRequerida: string;
  unidadMedida: string;
  activo: boolean;
  fechaAlta: string;
  fechaModificacion: string;
  itemCatalogoComponente?: ItemCatalogo | null;
};

export type ItemCatalogoComponentePayload = {
  idItemCatalogoHijo: string;
  cantidadRequerida: number;
  unidadMedida: string;
  activo?: boolean;
};
