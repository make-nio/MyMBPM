import { ErrorAplicacion } from "./error-aplicacion";

export class ErrorConflicto extends ErrorAplicacion {
  constructor(message: string, detalles?: unknown) {
    super(message, 409, "CONFLICTO", detalles);
    this.name = "ErrorConflicto";
  }
}

