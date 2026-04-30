import js from "@eslint/js";
import globals from "globals";
import reactRefresh from "eslint-plugin-react-refresh";
import reactHooks from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "**/playwright-report/**",
            "**/test-results/**",
        ],
    },
    js.configs.recommended,
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            }
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
            "no-console": "off",
            "no-undef": "off",
            "no-empty": "warn",
            "no-redeclare": "warn",
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }]
        },
    },
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
            "no-console": "off",
            "no-undef": "off",
            "no-empty": "warn",
            "no-redeclare": "warn",
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
        },
    }
];


