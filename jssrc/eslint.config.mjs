import { defineConfig } from "eslint/config";

const ignoreUnusedPatterns = [
    "^_",
    "fetchComments",
    ".*_link",
    "setImageLinks",
];

export default defineConfig([
    {
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: "script"
        },
        rules: {
            "max-len": ["error", {
                code: 120,
            }],
    
            indent: ["error", 4],
    
            "no-unused-vars": ["error", {
                varsIgnorePattern: ignoreUnusedPatterns.join("|"),
            }],
        }
    },
    {
        // Overrides for .mjs files
        files: ["**/*.mjs"],
        languageOptions: {
            sourceType: "module"
        }
    }
]);