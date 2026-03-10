import { z, ZodTypeAny } from "zod";

import { ErrorValidacion } from "../errores/error-validacion";

function formatearError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

export function validar<T extends ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ErrorValidacion("Datos de entrada invalidos", formatearError(result.error));
  }

  return result.data;
}

