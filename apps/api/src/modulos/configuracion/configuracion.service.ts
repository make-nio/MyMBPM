import { ModoDevolucionStock, MODOS_DEVOLUCION_STOCK } from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";

import { configuracionRepository } from "./configuracion.repository";

export type Configuracion = {
  cancelarPedidoModo: ModoDevolucionStock;
  cancelarPedidoDevolver: boolean;
  cancelarOrdenModo: ModoDevolucionStock;
  cancelarOrdenDevolver: boolean;
  // false en un deploy preview sin la migracion: se usa el comportamiento de antes y no se
  // puede guardar.
  guardada: boolean;
};

// Sin la tabla (o sin la fila) se comporta como antes de que existiera: al cancelar no se
// devuelve nada y no se pregunta.
const SIN_CONFIGURACION: Configuracion = {
  cancelarPedidoModo: "AUTOMATICO",
  cancelarPedidoDevolver: false,
  cancelarOrdenModo: "AUTOMATICO",
  cancelarOrdenDevolver: false,
  guardada: false
};

function aModo(valor: string): ModoDevolucionStock {
  return (MODOS_DEVOLUCION_STOCK as readonly string[]).includes(valor) ? (valor as ModoDevolucionStock) : "PREGUNTAR";
}

export type AccionCancelacion = "cancelarPedido" | "cancelarOrden";

export const configuracionService = {
  async obtener(): Promise<Configuracion> {
    const fila = await configuracionRepository.obtener();

    if (!fila) {
      return SIN_CONFIGURACION;
    }

    return {
      cancelarPedidoModo: aModo(fila.cancelarPedidoModo),
      cancelarPedidoDevolver: fila.cancelarPedidoDevolver,
      cancelarOrdenModo: aModo(fila.cancelarOrdenModo),
      cancelarOrdenDevolver: fila.cancelarOrdenDevolver,
      guardada: true
    };
  },

  async actualizar(data: {
    cancelarPedidoModo?: ModoDevolucionStock;
    cancelarPedidoDevolver?: boolean;
    cancelarOrdenModo?: ModoDevolucionStock;
    cancelarOrdenDevolver?: boolean;
  }) {
    // En un deploy preview (base sin migrar) la tabla no existe.
    if (!(await configuracionRepository.guardar(data))) {
      throw new ErrorConflicto("La configuracion todavia no esta disponible en esta base: falta migrar");
    }

    return this.obtener();
  },

  // Decide si al cancelar se devuelve el stock. En AUTOMATICO manda la configuracion (lo que
  // pida quien cancela no cuenta); en PREGUNTAR quien cancela tiene que decirlo.
  async decidirDevolucion(accion: AccionCancelacion, elegido: boolean | undefined) {
    const configuracion = await this.obtener();
    const modo = accion === "cancelarPedido" ? configuracion.cancelarPedidoModo : configuracion.cancelarOrdenModo;
    const porDefecto =
      accion === "cancelarPedido" ? configuracion.cancelarPedidoDevolver : configuracion.cancelarOrdenDevolver;

    if (modo === "AUTOMATICO") {
      return porDefecto;
    }

    if (elegido === undefined) {
      throw new ErrorValidacion("Indica si se devuelve al stock lo que se desconto", [
        { path: "devolverStock", message: "Elegi si se devuelve el stock" }
      ]);
    }

    return elegido;
  }
};
