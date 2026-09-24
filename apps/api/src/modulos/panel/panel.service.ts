import { EstadoPedido } from "../../compartido/dominio/enums";
import { prisma } from "../../lib/prisma";
import { stockService } from "../stock/stock.service";

import { panelRepository } from "./panel.repository";

// Pedidos que esperan confirmacion (todavia no descontaron stock) y los ya confirmados que
// falta entregar.
const ESTADOS_PENDIENTES: EstadoPedido[] = ["PENDIENTE"];
const ESTADOS_CONFIRMADOS: EstadoPedido[] = ["CONFIRMADO", "EN_PREPARACION", "LISTO"];

function sumarConteos(conteos: Array<{ estado: string; total: number }>, estados: string[]) {
  return conteos.filter((conteo) => estados.includes(conteo.estado)).reduce((total, conteo) => total + conteo.total, 0);
}

export const panelService = {
  // Lo que Maxi necesita ver al entrar: que confirmar, que entregar, que se esta fabricando,
  // que falta reponer y que se movio ultimo en el stock.
  async obtenerResumen({ limite }: { limite: number }) {
    const [
      conteosPedidos,
      pendientes,
      confirmados,
      conteosOrdenes,
      ordenesEnProceso,
      existencias,
      ultimosMovimientos
    ] = await Promise.all([
      panelRepository.contarPedidosPorEstado(prisma),
      panelRepository.listarPedidosPorEstados(prisma, ESTADOS_PENDIENTES, limite),
      panelRepository.listarPedidosPorEstados(prisma, ESTADOS_CONFIRMADOS, limite),
      panelRepository.contarOrdenesPorEstado(prisma),
      panelRepository.listarOrdenesEnProceso(prisma, limite),
      stockService.obtenerExistencias(prisma, { activo: true }),
      stockService.obtenerUltimosMovimientos(prisma, limite)
    ]);

    const pedidosPorEstado = conteosPedidos.map((conteo) => ({ estado: conteo.estadoPedido, total: conteo._count._all }));
    const ordenesPorEstado = conteosOrdenes.map((conteo) => ({
      estado: conteo.estadoProduccion,
      total: conteo._count._all
    }));
    // Los mas urgentes primero: los que mas lejos quedan de su minimo.
    const bajoMinimo = existencias
      .filter((existencia) => existencia.bajoMinimo)
      .sort((a, b) => a.stockActual.sub(a.stockMinimo).comparedTo(b.stockActual.sub(b.stockMinimo)));

    return {
      pedidos: {
        pendientes: { total: sumarConteos(pedidosPorEstado, ESTADOS_PENDIENTES), ultimos: pendientes },
        confirmados: { total: sumarConteos(pedidosPorEstado, ESTADOS_CONFIRMADOS), ultimos: confirmados }
      },
      produccion: {
        enProceso: { total: sumarConteos(ordenesPorEstado, ["EN_PROCESO"]), ordenes: ordenesEnProceso },
        pendientes: sumarConteos(ordenesPorEstado, ["PENDIENTE"])
      },
      stockBajo: { total: bajoMinimo.length, items: bajoMinimo.slice(0, limite) },
      ultimosMovimientos
    };
  }
};
