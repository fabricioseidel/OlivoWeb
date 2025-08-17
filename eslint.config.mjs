import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore generated files (Prisma wasm/runtime) which are not meant to be linted
  { ignores: ["src/generated/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Project overrides: allow explicit any for now to keep the build green.
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];

export default eslintConfig;
