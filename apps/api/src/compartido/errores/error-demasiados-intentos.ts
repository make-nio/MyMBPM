import { ErrorAplicacion } from "./error-aplicacion";

export class ErrorDemasiadosIntentos extends ErrorAplicacion {
  constructor(message: string, detalles?: unknown) {
    super(message, 429, "DEMASIADOS_INTENTOS", detalles);
    this.name = "ErrorDemasiadosIntentos";
  }
}
