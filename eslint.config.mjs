import { fixupConfigRules } from "@eslint/compat";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    {
        ignores: ["dist"],
    },
    ...fixupConfigRules(compat.extends("prettier")),
    {
        rules: {
            "react/react-in-jsx-scope": "off",
            camelcase: "error",
            "spaced-comment": "error",
            quotes: ["error", "double"],
            "no-duplicate-imports": "error",
            curly: "error",
            indent: ["error", 4], // Установите отступ в 4 пробела
        },
    },
];
