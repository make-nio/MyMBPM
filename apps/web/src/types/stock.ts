export type TipoStock = "PRODUCTO" | "INSUMO";

export type MovimientoStock = {
  idEstadoStock: string;
  idItemCatalogo: string;
  idUsuario: string | null;
  tipoStock: TipoStock;
  stockActual: string;
  stockAnterior: string;
  tipoMovimiento: string;
  cantidadMovimiento: string;
  origenMovimiento: string;
  idReferenciaOrigen: string | null;
  idReferenciaDetalle: string | null;
  observaciones: string | null;
  fechaAlta: string;
  usuario?: { nombre: string; apellido: string } | null;
};

export type StockActual = {
  idItemCatalogo: string;
  tipoStock: TipoStock;
  stockActual: string;
  ultimoMovimiento: MovimientoStock | null;
};
