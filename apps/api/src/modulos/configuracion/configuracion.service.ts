import { OPCIONES_DEVOLUCION_STOCK, OpcionDevolucionStock } from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";

import { configuracionRepository } from "./configuracion.repository";

// Que hacer con el stock al cancelar algo que ya lo desconto, por accion: preguntar en el
// momento, devolverlo siempre o no devolverlo nunca (issue #89).
export type Configuracion = {
  cancelarPedido: OpcionDevolucionStock;
  cancelarOrden: OpcionDevolucionStock;
  // false en un deploy preview sin la migracion: se usa el comportamiento de antes y no se
  // puede guardar.
  guardada: boolean;
};

// Sin la tabla (o sin la fila) se comporta como antes de que existiera: al cancelar no se
// devuelve nada y no se pregunta.
const SIN_CONFIGURACION: Configuracion = {
  cancelarPedido: "NO_DEVOLVER",
  cancelarOrden: "NO_DEVOLVER",
  guardada: false
};

function aOpcion(valor: string): OpcionDevolucionStock {
  return (OPCIONES_DEVOLUCION_STOCK as readonly string[]).includes(valor) ? (valor as OpcionDevolucionStock) : "PREGUNTAR";
}

export type AccionCancelacion = "cancelarPedido" | "cancelarOrden";

export const configuracionService = {
  async obtener(): Promise<Configuracion> {
    const fila = await configuracionRepository.obtener();

    if (!fila) {
      return SIN_CONFIGURACION;
    }

    return {
      cancelarPedido: aOpcion(fila.cancelarPedido),
      cancelarOrden: aOpcion(fila.cancelarOrden),
      guardada: true
    };
  },

  async actualizar(data: { cancelarPedido?: OpcionDevolucionStock; cancelarOrden?: OpcionDevolucionStock }) {
    // En un deploy preview (base sin migrar) la tabla no existe.
    if (!(await configuracionRepository.guardar(data))) {
      throw new ErrorConflicto("La configuracion todavia no esta disponible en esta base: falta migrar");
    }

    return this.obtener();
  },

  // Decide si al cancelar se devuelve el stock. Con DEVOLVER o NO_DEVOLVER manda la
  // configuracion (lo que pida quien cancela no cuenta); con PREGUNTAR quien cancela tiene que
  // decirlo.
  async decidirDevolucion(accion: AccionCancelacion, elegido: boolean | undefined) {
    const opcion = (await this.obtener())[accion];

    if (opcion !== "PREGUNTAR") {
      return opcion === "DEVOLVER";
    }

    if (elegido === undefined) {
      throw new ErrorValidacion("Indica si se devuelve al stock lo que se desconto", [
        { path: "devolverStock", message: "Elegi si se devuelve el stock" }
      ]);
    }

    return elegido;
  }
};
