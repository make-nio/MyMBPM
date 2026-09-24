import { z } from "zod";

import { ENTIDADES_AUDITADAS } from "../../compartido/dominio/enums";
import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

export const listarAuditoriaQuerySchema = paginacionSchema.extend({
  entidad: z.enum(ENTIDADES_AUDITADAS),
  idEntidad: idSchema
});
