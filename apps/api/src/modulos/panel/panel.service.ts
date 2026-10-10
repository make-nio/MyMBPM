import { Prisma } from "@prisma/client";

import { sumarDias } from "../../compartido/dominio/fecha-argentina";
import { prisma } from "../../lib/prisma";
import { stockService } from "../stock/stock.service";

import { panelRepository } from "./panel.repository";
import {
  diaArgentinaIso,
  diaDeHoy,
  diasDeAtraso,
  ESTADOS_ABIERTOS,
  ESTADOS_CONFIRMADOS,
  ESTADOS_PENDIENTES,
  porUrgenciaDeStock
} from "./reglas-panel";
import { calcularVentas, rangoMesArgentina } from "./ventas-mes";

const DIAS_PROXIMAS_ENTREGAS = 7;
// Cuantos de cada lista trae el resumen del dia.
const PRIMEROS_DEL_DIA = 3;

type PedidoConCliente = Awaited<ReturnType<typeof panelRepository.listarPedidosPorEstados>>[number];

function nombreCliente(pedido: PedidoConCliente) {
  return `${pedido.cliente.nombre} ${pedido.cliente.apellido ?? ""}`.trim();
}

function plural(cantidad: number, uno: string, varios: string) {
  return `${cantidad} ${cantidad === 1 ? uno : varios}`;
}

function sumarConteos(conteos: Array<{ estado: string; total: number }>, estados: string[]) {
  return conteos.filter((conteo) => estados.includes(conteo.estado)).reduce((total, conteo) => total + conteo.total, 0);
}

export const panelService = {
  // Lo que Maxi necesita ver al entrar: que confirmar, que entregar, que se esta fabricando,
  // que falta reponer y que se movio ultimo en el stock.
  async obtenerResumen({ limite }: { limite: number }, { verCostos }: { verCostos: boolean }, ahora = new Date()) {
    const mes = rangoMesArgentina(ahora);
    // Atrasado: la fecha prometida es de un dia anterior a hoy. Esta semana: de hoy a 7 dias.
    const { hoy } = diaDeHoy(ahora);
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
      panelRepository.listarPedidosConEntregaEntre(prisma, ESTADOS_ABIERTOS, finProximas)
    ]);

    const pedidosPorEstado = conteosPedidos.map((conteo) => ({ estado: conteo.estadoPedido, total: conteo._count._all }));
    const ordenesPorEstado = conteosOrdenes.map((conteo) => ({
      estado: conteo.estadoProduccion,
      total: conteo._count._all
    }));
    const bajoMinimo = porUrgenciaDeStock(existencias.filter((existencia) => existencia.bajoMinimo));

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
  },

  // Los avisos del encabezado: solo cuantos hay de cada cosa, calculado al consultar.
  async obtenerAvisos(ahora = new Date()) {
    const { hoy, manana } = diaDeHoy(ahora);
    const [bajoMinimo, entregasAtrasadas, entregasHoy] = await Promise.all([
      stockService.obtenerExistencias(prisma, { activo: true, soloBajoMinimo: true }),
      panelRepository.contarPedidosConEntregaEntre(prisma, ESTADOS_ABIERTOS, hoy),
      panelRepository.contarPedidosConEntregaEntre(prisma, ESTADOS_ABIERTOS, manana, hoy)
    ]);

    return { stockBajo: bajoMinimo.length, entregasAtrasadas, entregasHoy };
  },

  // Resumen del dia (#101): que hay para hacer hoy, en una forma estable que tambien va a pedir el
  // asistente de Maxi. Usa las mismas reglas que el panel y la campanita (reglas-panel.ts), asi
  // los numeros no pueden diferir. Sin costos ni plata para nadie. La forma solo crece: se le
  // agregan listas, no se cambian las que hay.
  async resumenDelDia(ahora = new Date()) {
    const { hoy, manana } = diaDeHoy(ahora);
    const [
      paraConfirmar,
      primerosParaConfirmar,
      atrasadas,
      primerasAtrasadas,
      deHoy,
      primerasDeHoy,
      bajoMinimo
    ] = await Promise.all([
      panelRepository.contarPedidosPorEstados(prisma, ESTADOS_PENDIENTES),
      panelRepository.listarPedidosPorEstados(prisma, ESTADOS_PENDIENTES, PRIMEROS_DEL_DIA, "antiguos"),
      panelRepository.contarPedidosConEntregaEntre(prisma, ESTADOS_ABIERTOS, hoy),
      panelRepository.listarPedidosConEntregaEntre(prisma, ESTADOS_ABIERTOS, hoy, undefined, PRIMEROS_DEL_DIA),
      panelRepository.contarPedidosConEntregaEntre(prisma, ESTADOS_ABIERTOS, manana, hoy),
      panelRepository.listarPedidosConEntregaEntre(prisma, ESTADOS_ABIERTOS, manana, hoy, PRIMEROS_DEL_DIA),
      stockService.obtenerExistencias(prisma, { activo: true, soloBajoMinimo: true })
    ]);

    const pedido = (p: PedidoConCliente) => ({ idPedido: p.idPedido, numeroPedido: p.numeroPedido, cliente: nombreCliente(p) });
    const conEntrega = (p: PedidoConCliente) => ({ ...pedido(p), fechaEntrega: p.fechaEntrega as Date });
    const reponer = porUrgenciaDeStock(bajoMinimo);

    const resumen = {
      fecha: diaArgentinaIso(hoy),
      pedidosParaConfirmar: { cantidad: paraConfirmar, primeros: primerosParaConfirmar.map(pedido) },
      entregasAtrasadas: {
        cantidad: atrasadas,
        primeros: primerasAtrasadas.map((p) => ({ ...conEntrega(p), diasDeAtraso: diasDeAtraso(p.fechaEntrega as Date, hoy) }))
      },
      entregasDeHoy: { cantidad: deHoy, primeros: primerasDeHoy.map(conEntrega) },
      paraReponer: {
        cantidad: reponer.length,
        primeros: reponer.slice(0, PRIMEROS_DEL_DIA).map((item) => ({
          idItemCatalogo: item.idItemCatalogo,
          nombre: item.nombre,
          tipo: item.tipoItem,
          stockActual: item.stockActual,
          stockMinimo: item.stockMinimo,
          faltan: new Prisma.Decimal(item.stockMinimo).sub(item.stockActual)
        }))
      }
    };

    return {
      ...resumen,
      // Ya armadas en espanol; las que dan cero no van.
      frases: [
        resumen.pedidosParaConfirmar.cantidad > 0 ? plural(resumen.pedidosParaConfirmar.cantidad, "pedido para confirmar", "pedidos para confirmar") : null,
        resumen.entregasAtrasadas.cantidad > 0 ? plural(resumen.entregasAtrasadas.cantidad, "entrega atrasada", "entregas atrasadas") : null,
        resumen.entregasDeHoy.cantidad > 0 ? plural(resumen.entregasDeHoy.cantidad, "entrega para hoy", "entregas para hoy") : null,
        resumen.paraReponer.cantidad > 0 ? plural(resumen.paraReponer.cantidad, "ítem para reponer", "ítems para reponer") : null
      ].filter((frase): frase is string => frase !== null)
    };
  }
};
