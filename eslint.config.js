const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettier = require("eslint-plugin-prettier");

module.exports = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",

      "prettier/prettier": "error",

      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "function" },
      ],

      "lines-between-class-members": ["error", "always"],
    },
  },
];