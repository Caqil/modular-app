/** @type {import('prettier').Config} */
module.exports = {
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  printWidth: 80,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
  htmlWhitespaceSensitivity: 'css',
  insertPragma: false,
  jsxSingleQuote: false,
  proseWrap: 'preserve',
  requirePragma: false,
  vueIndentScriptAndStyle: false,
  
  // Plugin configurations
  plugins: [
    'prettier-plugin-tailwindcss',
    '@trivago/prettier-plugin-sort-imports',
  ],
  
  // Tailwind CSS plugin
  tailwindConfig: './tailwind.config.js',
  tailwindFunctions: ['clsx', 'cva', 'cn'],
  
  // Import sorting
  importOrder: [
    '^react$',
    '^react-dom$',
    '^next',
    '<THIRD_PARTY_MODULES>',
    '^@modular-app/(.*)$',
    '^@/(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderBuiltinModulesToTop: true,
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderMergeDuplicateImports: true,
  importOrderCombineTypeAndValueImports: true,
  
  // File-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.{yml,yaml}',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.{js,jsx,ts,tsx}',
      options: {
        printWidth: 80,
      },
    },
  ],
};
