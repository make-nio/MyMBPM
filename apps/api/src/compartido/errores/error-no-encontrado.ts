import { ErrorAplicacion } from "./error-aplicacion";

export class ErrorNoEncontrado extends ErrorAplicacion {
  constructor(message: string) {
    super(message, 404, "NO_ENCONTRADO");
    this.name = "ErrorNoEncontrado";
  }
}

