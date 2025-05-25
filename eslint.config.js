// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default tseslint.config(
    {
        ignores: ["dist/", "vite.config.js"],
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,
);
