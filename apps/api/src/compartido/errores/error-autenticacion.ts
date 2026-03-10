import { ErrorAplicacion } from "./error-aplicacion";

export class ErrorAutenticacion extends ErrorAplicacion {
  constructor(message: string, detalles?: unknown) {
    super(message, 401, "NO_AUTENTICADO", detalles);
    this.name = "ErrorAutenticacion";
  }
}
