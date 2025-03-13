module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["airbnb-base", "prettier"],
  overrides: [],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "always",
      },
    ],
    "import/prefer-default-export": "off",
  },
};
