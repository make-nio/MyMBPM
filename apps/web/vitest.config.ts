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
      reporter: ["text-summary", "json"]
    }
  }
});
