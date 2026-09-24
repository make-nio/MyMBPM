import { defineConfig } from "vitest/config";

// Pruebas unitarias de la logica del front (src/lib). Las pantallas se prueban con Playwright.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      reportsDirectory: "coverage/unit",
      reporter: ["text-summary", "json"],
      // Piso de cobertura de lineas solo con vitest (sin E2E), para que no retroceda: el valor de
      // septiembre de 2026 con Vitest 5 (56,0 %). El umbral bloqueante del CI es el 70 % combinado con E2E.
      thresholds: { lines: 56 }
    }
  }
});
