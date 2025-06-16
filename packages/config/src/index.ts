// Re-export configuration utilities
export const configs = {
  // TypeScript configurations are JSON files
  // ESLint and other configs are JS modules
  eslint: {
    base: './eslint/base.js',
    react: './eslint/react.js', 
    node: './eslint/node.js',
  },
  prettier: './prettier/index.js',
  tailwind: {
    base: './tailwind/base.js',
    preset: './tailwind/preset.js',
  },
  typescript: {
    base: './typescript/base.json',
    react: './typescript/react.json',
    node: './typescript/node.json',
  },
} as const;

export default configs;