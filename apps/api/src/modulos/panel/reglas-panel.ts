import { Prisma } from "@prisma/client";

import { EstadoPedido } from "../../compartido/dominio/enums";
import { inicioDelDiaArgentina, OFFSET_ARGENTINA_MS, sumarDias } from "../../compartido/dominio/fecha-argentina";

// Reglas que comparten el panel, la campanita del encabezado y el resumen del dia (#101). Estan
// escritas una sola vez: si cambian aca, cambian en los tres.

// Pedidos que esperan confirmacion (todavia no descontaron stock) y los ya confirmados que
// falta entregar.
export const ESTADOS_PENDIENTES: EstadoPedido[] = ["PENDIENTE"];
export const ESTADOS_CONFIRMADOS: EstadoPedido[] = ["CONFIRMADO", "EN_PREPARACION", "LISTO"];
// Una fecha prometida importa mientras el pedido no se entrego ni se cancelo.
export const ESTADOS_ABIERTOS: EstadoPedido[] = [...ESTADOS_PENDIENTES, ...ESTADOS_CONFIRMADOS];

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Hoy en Argentina: [hoy, manana). Atrasado es una fecha prometida anterior a hoy.
export function diaDeHoy(ahora: Date) {
  const hoy = inicioDelDiaArgentina(ahora);
  return { hoy, manana: sumarDias(hoy, 1) };
}

// "2026-10-03" del dia de Argentina en que cae la fecha.
export function diaArgentinaIso(fecha: Date) {
  return new Date(fecha.getTime() - OFFSET_ARGENTINA_MS).toISOString().slice(0, 10);
}

// Dias completos entre el dia de la fecha prometida y hoy (Argentina).
export function diasDeAtraso(fechaEntrega: Date, hoy: Date) {
  return Math.round((hoy.getTime() - inicioDelDiaArgentina(fechaEntrega).getTime()) / UN_DIA_MS);
}

// Bajo minimo, los mas urgentes primero: los que mas lejos quedan de su minimo.
export function porUrgenciaDeStock<T extends { stockActual: Prisma.Decimal; stockMinimo: number }>(items: T[]) {
  return [...items].sort((a, b) => a.stockActual.sub(a.stockMinimo).comparedTo(b.stockActual.sub(b.stockMinimo)));
}
