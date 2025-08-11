import {defineConfig} from "tsup";

export default defineConfig([
  // Lambda handler build
  {
    entry: ["src/handler.ts"],
    splitting: false,
    sourcemap: true,
    clean: false,
    outDir: "dist/handler",
    external: ["@aws-sdk/*"],
    bundle: true,
  },
]);
