import { OPCIONES_DEVOLUCION_STOCK } from "../../compartido/dominio/enums";
import { actualizarConfiguracionSchema } from "../../modulos/configuracion/configuracion.schemas";
import { Endpoint, objeto, z } from "../base";

const etiqueta = "configuracion";

// configuracionService.obtener: la fila de CONFIGURACION, o el comportamiento de antes
// (guardada: false) si la base todavia no tiene la tabla.
const configuracionSchema = objeto({
  cancelarPedido: z.enum(OPCIONES_DEVOLUCION_STOCK),
  cancelarOrden: z.enum(OPCIONES_DEVOLUCION_STOCK),
  devolucionStock: z.enum(OPCIONES_DEVOLUCION_STOCK),
  devolucionReintegro: z.enum(OPCIONES_DEVOLUCION_STOCK),
  guardada: z.boolean()
}).openapi("Configuracion");

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/configuracion",
    acceso: "autenticado",
    resumen: "Que hacer con el stock al cancelar, y con el stock y la plata al registrar una devolucion",
    etiqueta,
    respuesta: configuracionSchema
  },
  {
    metodo: "patch",
    ruta: "/api/configuracion",
    acceso: "administrador",
    resumen: "Cambia la configuracion (solo administradores)",
    etiqueta,
    body: actualizarConfiguracionSchema,
    respuesta: configuracionSchema
  }
] as const satisfies readonly Endpoint[];
