import { defineConfig } from "eslint/config";

const ignoreUnusedPatterns = [
	"_",
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
			indent: ["error", "tab"],
			"no-unused-vars": ["error", {
				varsIgnorePattern: ignoreUnusedPatterns.join("|"),
			}],
		}
	},
	{
		// Overrides for .mjs files
		files: ["**/*.mjs"],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: "module"
		}
	}
]);