import {defineConfig} from "tsup";

export default defineConfig([
  {
    entry: ["src/bin.ts"],
    splitting: false,
    clean: true,
  },
  {
    entry: ["src/index.ts"],
    splitting: true,
    sourcemap: true,
    clean: true,
    dts: true,
    external: ["@aws-sdk/client-ecr"],
  },
]);
