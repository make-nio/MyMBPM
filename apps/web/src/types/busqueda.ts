import { EstadoPedido } from "./pedidos";
import { TipoItem } from "./items-catalogo";

export type ResultadoPedido = {
  idPedido: string;
  numeroPedido: string | null;
  estadoPedido: EstadoPedido;
  total: string;
  fechaAlta: string;
  cliente: { nombre: string; apellido: string | null };
};

export type ResultadoCliente = {
  idCliente: string;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
};

export type ResultadoItem = {
  idItemCatalogo: string;
  nombre: string;
  tipoItem: TipoItem;
  categoria: string;
  precio: string | null;
  // Solo llega para quien puede ver costos (ver puedeVerCostos en la API).
  costo?: string | null;
  activo: boolean;
};

export type ResultadosBusqueda = {
  pedidos: ResultadoPedido[];
  clientes: ResultadoCliente[];
  items: ResultadoItem[];
};
