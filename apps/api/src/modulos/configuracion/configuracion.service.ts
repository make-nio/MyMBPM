import { OPCIONES_DEVOLUCION_STOCK, OpcionDevolucionStock } from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";

import { configuracionRepository } from "./configuracion.repository";

// Que hacer, por accion, con lo que ya se desconto o se cobro: preguntar en el momento, hacerlo
// siempre o no hacerlo nunca. Cancelar un pedido o una orden (#89): devolver el stock.
// Devolucion de un pedido entregado (#96): que vuelva al stock y reintegrar la plata.
export type Configuracion = {
  cancelarPedido: OpcionDevolucionStock;
  cancelarOrden: OpcionDevolucionStock;
  devolucionStock: OpcionDevolucionStock;
  devolucionReintegro: OpcionDevolucionStock;
  // false en un deploy preview sin la migracion: se usa el comportamiento de antes y no se
  // puede guardar.
  guardada: boolean;
};

export type AccionConfigurable = Exclude<keyof Configuracion, "guardada">;

// Sin la tabla (o sin la fila) se comporta como antes de que existiera: al cancelar no se
// devuelve nada y no se pregunta.
const SIN_CONFIGURACION: Configuracion = {
  cancelarPedido: "NO_DEVOLVER",
  cancelarOrden: "NO_DEVOLVER",
  devolucionStock: "PREGUNTAR",
  devolucionReintegro: "PREGUNTAR",
  guardada: false
};

function aOpcion(valor: string | undefined): OpcionDevolucionStock {
  return valor !== undefined && (OPCIONES_DEVOLUCION_STOCK as readonly string[]).includes(valor)
    ? (valor as OpcionDevolucionStock)
    : "PREGUNTAR";
}

// Que campo del cuerpo trae la eleccion de quien lo hace, para el 400 cuando hay que preguntar.
const CAMPO_ELECCION: Record<AccionConfigurable, { path: string; message: string }> = {
  cancelarPedido: { path: "devolverStock", message: "Elegi si se devuelve el stock" },
  cancelarOrden: { path: "devolverStock", message: "Elegi si se devuelve el stock" },
  devolucionStock: { path: "devolverStock", message: "Elegi si lo devuelto vuelve al stock" },
  devolucionReintegro: { path: "reintegrar", message: "Elegi si se reintegra la plata" }
};

export const configuracionService = {
  async obtener(): Promise<Configuracion> {
    const fila = await configuracionRepository.obtener();

    if (!fila) {
      return SIN_CONFIGURACION;
    }

    // En un preview con la tabla pero sin las columnas de #96, las de la devolucion no vienen.
    const columnas = fila as { devolucionStock?: string; devolucionReintegro?: string };

    return {
      cancelarPedido: aOpcion(fila.cancelarPedido),
      cancelarOrden: aOpcion(fila.cancelarOrden),
      devolucionStock: aOpcion(columnas.devolucionStock),
      devolucionReintegro: aOpcion(columnas.devolucionReintegro),
      guardada: "devolucionStock" in fila
    };
  },

  async actualizar(data: Partial<Record<AccionConfigurable, OpcionDevolucionStock>>) {
    // En un deploy preview (base sin migrar) la tabla o sus columnas no existen.
    if (!(await configuracionRepository.guardar(data))) {
      throw new ErrorConflicto("La configuracion todavia no esta disponible en esta base: falta migrar");
    }

    return this.obtener();
  },

  // Decide si se hace (devolver el stock, reintegrar la plata). Con DEVOLVER o NO_DEVOLVER manda
  // la configuracion (lo que pida quien lo hace no cuenta); con PREGUNTAR quien lo hace tiene que
  // decirlo.
  async decidirDevolucion(accion: AccionConfigurable, elegido: boolean | undefined) {
    const opcion = (await this.obtener())[accion];

    if (opcion !== "PREGUNTAR") {
      return opcion === "DEVOLVER";
    }

    if (elegido === undefined) {
      throw new ErrorValidacion("Falta elegir que hacer con lo devuelto", [CAMPO_ELECCION[accion]]);
    }

    return elegido;
  }
};
