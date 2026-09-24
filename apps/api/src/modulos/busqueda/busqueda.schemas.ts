import { z } from "zod";

// Resultados por grupo (pedidos, clientes, items): la busqueda global muestra pocos y lleva a la
// pantalla de cada uno; para ver mas se usa la busqueda de esa pantalla.
export const RESULTADOS_POR_GRUPO = 5;

export const buscarQuerySchema = z.object({
  q: z.string().trim().min(2, "Escribi al menos 2 letras o numeros").max(100)
});
