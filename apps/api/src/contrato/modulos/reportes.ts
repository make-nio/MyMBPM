import { Endpoint, decimal, fecha, id, lista, objeto, z } from "../base";
import { ventasMesQuerySchema } from "../../modulos/reportes/reportes.schemas";

const etiqueta = "reportes";

// Las dos rutas son solo para administradores (requerirAdministrador), que son los unicos que
// pueden ver costos: el middleware de costos nunca les quita `costo`, por eso va obligatorio.

// Totales del rango: mismo calculo que "Este mes" del panel (panel/ventas-mes.ts).
export const totalesVentasSchema = objeto({
  pedidos: z.number().int(),
  vendido: decimal,
  costo: decimal,
  ganancia: decimal,
  // Lineas con costo 0 (sin costo cargado): la ganancia puede estar inflada.
  lineasSinCosto: z.number().int()
}).openapi("TotalesVentas");

const ventaPorItemSchema = objeto({
  idItemCatalogo: id,
  nombre: z.string(),
  cantidad: decimal,
  vendido: decimal,
  costo: decimal,
  pedidos: z.number().int(),
  ganancia: decimal
});

const ventaPorClienteSchema = objeto({
  idCliente: id,
  // Nombre y apellido juntos.
  nombre: z.string(),
  pedidos: z.number().int(),
  vendido: decimal,
  costo: decimal,
  ganancia: decimal
});

const ventasDelMesSchema = objeto({
  desde: fecha,
  hasta: fecha,
  totales: totalesVentasSchema,
  porItem: lista(ventaPorItemSchema),
  porCliente: lista(ventaPorClienteSchema)
}).openapi("VentasDelMes");

const ventasPorMesSchema = objeto({
  desde: fecha,
  hasta: fecha,
  // Los 12 meses, del mas viejo al actual, tambien los que no tuvieron ventas.
  meses: lista(
    objeto({
      mes: z.string().regex(/^\d{4}-\d{2}$/),
      vendido: decimal,
      pedidos: z.number().int()
    })
  )
}).openapi("VentasPorMes");

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/reportes/ventas-mes",
    resumen: "Vendido, costo y ganancia de un mes, por item y por cliente (solo administradores)",
    etiqueta,
    query: ventasMesQuerySchema,
    respuesta: ventasDelMesSchema
  },
  {
    metodo: "get",
    ruta: "/api/reportes/ventas-por-mes",
    resumen: "Vendido por mes en los ultimos 12 meses (solo administradores)",
    etiqueta,
    respuesta: ventasPorMesSchema
  }
] as const satisfies readonly Endpoint[];
