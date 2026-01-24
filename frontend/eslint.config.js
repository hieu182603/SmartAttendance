import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser
            }
        },
        plugins: {
        },
        rules: {
            "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
            "no-console": "off",
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            // Prevent direct lucide-react imports - use centralized icons instead
            "no-restricted-imports": ["error", {
                paths: [{
                    name: "lucide-react",
                    message: "Import icons from @/components/ui/icons instead for better tree-shaking"
                }]
            }]
        },
        ignores: [
            "node_modules/**",
            "dist/**"
        ]
    }
];


