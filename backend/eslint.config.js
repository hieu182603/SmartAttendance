import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node
            }
        },
        rules: {
            "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
            "no-console": "off"
        },
        ignores: [
            "node_modules/**",
            "dist/**"
        ]
    }
];


