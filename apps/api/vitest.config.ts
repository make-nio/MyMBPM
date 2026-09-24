import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
      reportsDirectory: "coverage/unit",
      reporter: ["text-summary", "json"],
      // Piso de cobertura de lineas solo con vitest (sin E2E), para que no retroceda: el valor de
      // septiembre de 2026 (47,4 %). El umbral bloqueante del CI es el 70 % combinado con E2E.
      thresholds: { lines: 47 }
    }
  }
});
