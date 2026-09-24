import { z } from "zod";

// Topes de entrada: que ningun valor rompa una columna (BigInt, Decimal(18,2|3)) ni una suma (el
// total de un pedido con el maximo de lineas, cantidades y precios entra en Decimal(18,2)). El
// contrato los toma de estos schemas y los prueban contrato.test.ts y e2e/limites.spec.ts.
export const LIMITES = {
  cantidad: 100_000,
  monto: 100_000_000,
  stockMinimo: 1_000_000,
  ordenImagen: 1_000,
  offset: 100_000,
  lineasPorPedido: 100,
  lineasPorOrden: 100
} as const;

// El mayor BIGINT de Postgres: un id mas grande no existe y haria fallar la consulta.
const MAXIMO_ID = 9_223_372_036_854_775_807n;

export const idSchema = z.coerce.bigint().positive().max(MAXIMO_ID);

export const cantidadSchema = z.coerce.number().positive().max(LIMITES.cantidad);

export const montoSchema = z.coerce.number().nonnegative().max(LIMITES.monto);

export const offsetSchema = z.coerce.number().int().min(0).max(LIMITES.offset).default(0);

export const paginacionSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: offsetSchema
});
