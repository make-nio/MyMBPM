import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { calcularVentas, rangoMesArgentina } from "../panel/ventas-mes";

import { reportesRepository } from "./reportes.repository";

type PedidoVendido = Awaited<ReturnType<typeof reportesRepository.listarPedidosVendidosEntre>>[number];

const cero = () => new Prisma.Decimal(0);

// "2026-08" -> un instante de ese mes; rangoMesArgentina calcula del 1 al 1 del mes siguiente.
function instanteDelMes(mes: string) {
  const [anio, numero] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, numero - 1, 15, 12));
}

function porItem(pedidos: PedidoVendido[]) {
  const grupos = new Map<
    string,
    { idItemCatalogo: bigint; nombre: string; cantidad: Prisma.Decimal; vendido: Prisma.Decimal; costo: Prisma.Decimal; pedidos: Set<bigint> }
  >();

  for (const pedido of pedidos) {
    for (const detalle of pedido.detalles) {
      const clave = detalle.idItemCatalogo.toString();
      const grupo = grupos.get(clave) ?? {
        idItemCatalogo: detalle.idItemCatalogo,
        nombre: detalle.itemCatalogo?.nombre ?? detalle.nombreItemSnapshot,
        cantidad: cero(),
        vendido: cero(),
        costo: cero(),
        pedidos: new Set<bigint>()
      };
      grupo.cantidad = grupo.cantidad.add(detalle.cantidad);
      grupo.vendido = grupo.vendido.add(detalle.subtotal);
      grupo.costo = grupo.costo.add(detalle.costoUnitario.mul(detalle.cantidad));
      grupo.pedidos.add(pedido.idPedido);
      grupos.set(clave, grupo);
    }
  }

  return [...grupos.values()]
    .map(({ pedidos: conjunto, ...grupo }) => ({
      ...grupo,
      pedidos: conjunto.size,
      ganancia: grupo.vendido.sub(grupo.costo)
    }))
    .sort((a, b) => b.vendido.comparedTo(a.vendido) || a.nombre.localeCompare(b.nombre));
}

function porCliente(pedidos: PedidoVendido[]) {
  const grupos = new Map<
    string,
    { idCliente: bigint; nombre: string; pedidos: number; vendido: Prisma.Decimal; costo: Prisma.Decimal }
  >();

  for (const pedido of pedidos) {
    const clave = pedido.cliente.idCliente.toString();
    const grupo = grupos.get(clave) ?? {
      idCliente: pedido.cliente.idCliente,
      nombre: `${pedido.cliente.nombre} ${pedido.cliente.apellido ?? ""}`.trim(),
      pedidos: 0,
      vendido: cero(),
      costo: cero()
    };
    grupo.pedidos += 1;
    grupo.vendido = grupo.vendido.add(pedido.total);
    grupo.costo = pedido.detalles.reduce((costo, detalle) => costo.add(detalle.costoUnitario.mul(detalle.cantidad)), grupo.costo);
    grupos.set(clave, grupo);
  }

  return [...grupos.values()]
    .map((grupo) => ({ ...grupo, ganancia: grupo.vendido.sub(grupo.costo) }))
    .sort((a, b) => b.vendido.comparedTo(a.vendido) || a.nombre.localeCompare(b.nombre));
}

export const reportesService = {
  // Vendido del mes por item y por cliente. Mismo criterio que "Este mes" del panel: lo
  // confirmado en el mes (hora de Argentina), sin cancelados; costo = snapshot de cada linea.
  async ventasDelMes({ mes }: { mes?: string }, ahora = new Date()) {
    const rango = rangoMesArgentina(mes ? instanteDelMes(mes) : ahora);
    const pedidos = await reportesRepository.listarPedidosVendidosEntre(prisma, rango.desde, rango.hasta);

    return {
      desde: rango.desde,
      hasta: rango.hasta,
      totales: calcularVentas(pedidos),
      porItem: porItem(pedidos),
      porCliente: porCliente(pedidos)
    };
  }
};
