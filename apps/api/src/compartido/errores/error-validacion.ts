import { ErrorAplicacion } from "./error-aplicacion";

export class ErrorValidacion extends ErrorAplicacion {
  constructor(message: string, detalles?: unknown) {
    super(message, 400, "VALIDACION", detalles);
    this.name = "ErrorValidacion";
  }
}

