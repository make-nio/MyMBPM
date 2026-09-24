// Decimales de Prisma serializados como texto.
export type VentasTotales = {
  pedidos: number;
  vendido: string;
  costo: string;
  ganancia: string;
  lineasSinCosto: number;
};

export type VentaPorItem = {
  idItemCatalogo: string;
  nombre: string;
  cantidad: string;
  vendido: string;
  costo: string;
  ganancia: string;
  pedidos: number;
};

export type VentaPorCliente = {
  idCliente: string;
  nombre: string;
  pedidos: number;
  vendido: string;
  costo: string;
  ganancia: string;
};

export type ReporteVentasMes = {
  desde: string;
  hasta: string;
  totales: VentasTotales;
  porItem: VentaPorItem[];
  porCliente: VentaPorCliente[];
};
