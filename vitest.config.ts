import { defineConfig } from "vitest/config";
import * as path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // @/generated doit précéder @ : en Vite, le premier alias correspondant gagne.
      // En environnement de test node, @microsoft/power-apps (ESM pur) ne peut pas
      // être résolu ; ce stub léger suffit pour tester les fonctions pures de sapLists.js.
      "@/generated": path.resolve(__dirname, "./src/__test-stubs__/generated.js"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
  },
});
