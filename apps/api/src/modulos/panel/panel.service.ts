import { EstadoPedido } from "../../compartido/dominio/enums";
import { inicioDelDiaArgentina, sumarDias } from "../../compartido/dominio/fecha-argentina";
import { prisma } from "../../lib/prisma";
import { stockService } from "../stock/stock.service";

import { panelRepository } from "./panel.repository";
import { calcularVentas, rangoMesArgentina } from "./ventas-mes";

// Pedidos que esperan confirmacion (todavia no descontaron stock) y los ya confirmados que
// falta entregar.
const ESTADOS_PENDIENTES: EstadoPedido[] = ["PENDIENTE"];
const ESTADOS_CONFIRMADOS: EstadoPedido[] = ["CONFIRMADO", "EN_PREPARACION", "LISTO"];
// Una fecha prometida importa mientras el pedido no se entrego ni se cancelo.
const ESTADOS_ABIERTOS: EstadoPedido[] = [...ESTADOS_PENDIENTES, ...ESTADOS_CONFIRMADOS];
const DIAS_PROXIMAS_ENTREGAS = 7;

function sumarConteos(conteos: Array<{ estado: string; total: number }>, estados: string[]) {
  return conteos.filter((conteo) => estados.includes(conteo.estado)).reduce((total, conteo) => total + conteo.total, 0);
}

export const panelService = {
  // Lo que Maxi necesita ver al entrar: que confirmar, que entregar, que se esta fabricando,
  // que falta reponer y que se movio ultimo en el stock.
  async obtenerResumen({ limite }: { limite: number }, { verCostos }: { verCostos: boolean }, ahora = new Date()) {
    const mes = rangoMesArgentina(ahora);
    // Atrasado: la fecha prometida es de un dia anterior a hoy. Esta semana: de hoy a 7 dias.
    const hoy = inicioDelDiaArgentina(ahora);
    const finProximas = sumarDias(hoy, DIAS_PROXIMAS_ENTREGAS);
    const [
      conteosPedidos,
      pendientes,
      confirmados,
      conteosOrdenes,
      ordenesEnProceso,
      existencias,
      ultimosMovimientos,
      vendidosDelMes,
      conEntregaCercana
    ] = await Promise.all([
      panelRepository.contarPedidosPorEstado(prisma),
      panelRepository.listarPedidosPorEstados(prisma, ESTADOS_PENDIENTES, limite),
      panelRepository.listarPedidosPorEstados(prisma, ESTADOS_CONFIRMADOS, limite),
      panelRepository.contarOrdenesPorEstado(prisma),
      panelRepository.listarOrdenesEnProceso(prisma, limite),
      stockService.obtenerExistencias(prisma, { activo: true }),
      stockService.obtenerUltimosMovimientos(prisma, limite),
      verCostos ? panelRepository.listarPedidosConfirmadosEntre(prisma, mes.desde, mes.hasta) : Promise.resolve(null),
      panelRepository.listarPedidosConEntregaAntesDe(prisma, ESTADOS_ABIERTOS, finProximas)
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

    const atrasados = conEntregaCercana.filter((pedido) => pedido.fechaEntrega && pedido.fechaEntrega < hoy);
    const estaSemana = conEntregaCercana.filter((pedido) => pedido.fechaEntrega && pedido.fechaEntrega >= hoy);

    return {
      entregas: {
        atrasados: { total: atrasados.length, pedidos: atrasados.slice(0, limite) },
        estaSemana: { total: estaSemana.length, pedidos: estaSemana.slice(0, limite) }
      },
      pedidos: {
        pendientes: { total: sumarConteos(pedidosPorEstado, ESTADOS_PENDIENTES), ultimos: pendientes },
        confirmados: { total: sumarConteos(pedidosPorEstado, ESTADOS_CONFIRMADOS), ultimos: confirmados }
      },
      produccion: {
        enProceso: { total: sumarConteos(ordenesPorEstado, ["EN_PROCESO"]), ordenes: ordenesEnProceso },
        pendientes: sumarConteos(ordenesPorEstado, ["PENDIENTE"])
      },
      stockBajo: { total: bajoMinimo.length, items: bajoMinimo.slice(0, limite) },
      ultimosMovimientos,
      // Lo confirmado este mes (hora de Argentina), sin cancelados. Solo con permiso de ver costos.
      ...(vendidosDelMes ? { ventasDelMes: { desde: mes.desde, ...calcularVentas(vendidosDelMes) } } : {})
    };
  }
};
