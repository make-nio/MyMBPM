// Genera docs/openapi.json desde el contrato (apps/api/src/contrato). npm run contrato:generar
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { generarOpenApi } from "../src/contrato/openapi";

const destino = join(__dirname, "../../../docs/openapi.json");
writeFileSync(destino, `${JSON.stringify(generarOpenApi(), null, 2)}\n`);
console.log(`Contrato escrito en ${destino}`);
