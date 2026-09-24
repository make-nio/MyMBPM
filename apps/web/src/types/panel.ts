import { EstadoPedido } from "./pedidos";
import { TipoStock } from "./stock";

type PedidoResumen = {
  idPedido: string;
  numeroPedido: string | null;
  estadoPedido: EstadoPedido;
  total: string;
  fechaAlta: string;
  cliente?: { nombre: string; apellido: string | null } | null;
};

type OrdenResumen = {
  idOrdenProduccion: string;
  fechaInicio: string | null;
  detalles: Array<{ cantidad: string; itemCatalogoProducto?: { nombre: string } | null }>;
};

type ItemStockBajo = {
  idItemCatalogo: string;
  nombre: string;
  tipoItem: TipoStock;
  stockActual: string;
  stockMinimo: number;
};

type MovimientoResumen = {
  idEstadoStock: string;
  tipoMovimiento: string;
  stockAnterior: string;
  stockActual: string;
  cantidadMovimiento: string;
  fechaAlta: string;
  itemCatalogo?: { nombre: string } | null;
  usuario?: { nombre: string; apellido: string } | null;
};

export type ResumenPanel = {
  pedidos: {
    pendientes: { total: number; ultimos: PedidoResumen[] };
    confirmados: { total: number; ultimos: PedidoResumen[] };
  };
  produccion: {
    enProceso: { total: number; ordenes: OrdenResumen[] };
    pendientes: number;
  };
  stockBajo: { total: number; items: ItemStockBajo[] };
  ultimosMovimientos: MovimientoResumen[];
  // Lo confirmado en el mes en curso (hora de Argentina), sin cancelados.
  ventasDelMes: {
    desde: string;
    pedidos: number;
    vendido: string;
    costo: string;
    ganancia: string;
    lineasSinCosto: number;
  };
};
