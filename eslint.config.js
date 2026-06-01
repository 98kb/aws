import {recommended, strict, typescript} from "eslint-config-98kb";
import {defineConfig, globalIgnores} from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/node_modules/**",
    "**/coverage/**",
    "**/.next/**",
    "packages/eslint-config/**",
    "**/cdk.out/**",
  ]),
  ...recommended,
  ...strict,
  ...typescript,
  {
    rules: {
      "no-new": "off",
      camelcase: "off",
    },
  },
  {
    files: ["packages/ecr-publisher/**/*.test.ts"],
    rules: {
      complexity: "off",
      "max-nested-callbacks": "off",
      "max-statements": "off",
    },
  },
]);
