import { ItemCatalogo } from "./items-catalogo";

export const ESTADOS_PRODUCCION = ["PENDIENTE", "EN_PROCESO", "FINALIZADA", "CANCELADA"] as const;
export type EstadoProduccion = (typeof ESTADOS_PRODUCCION)[number];

export type OrdenProduccionDetalle = {
  idOrdenProduccionDetalle: string;
  idOrdenProduccion: string;
  idItemCatalogoProducto: string;
  cantidad: string;
  observaciones: string | null;
  itemCatalogoProducto?: ItemCatalogo;
};

export type OrdenProduccionConsumo = {
  idOrdenProduccionConsumo: string;
  idOrdenProduccion: string;
  idItemCatalogoInsumo: string;
  cantidad: string;
  fechaAlta: string;
  itemCatalogoInsumo?: ItemCatalogo;
};

export type OrdenProduccion = {
  idOrdenProduccion: string;
  estadoProduccion: EstadoProduccion;
  observaciones: string | null;
  fechaAlta: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  activo: boolean;
  detalles?: OrdenProduccionDetalle[];
  consumos?: OrdenProduccionConsumo[];
};
