import { COBERTURA_E2E } from "./entorno";
import { crearReporteCobertura } from "./cobertura";

export default async function globalTeardown() {
  if (COBERTURA_E2E) {
    await crearReporteCobertura().generate();
  }
}
