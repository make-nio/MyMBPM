export class ErrorAplicacion extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly codigo: string,
    public readonly detalles?: unknown
  ) {
    super(message);
    this.name = "ErrorAplicacion";
  }
}

