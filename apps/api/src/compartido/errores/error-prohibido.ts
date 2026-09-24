import { ErrorAplicacion } from "./error-aplicacion";

export class ErrorProhibido extends ErrorAplicacion {
  constructor(message: string, detalles?: unknown) {
    super(message, 403, "PROHIBIDO", detalles);
    this.name = "ErrorProhibido";
  }
}
