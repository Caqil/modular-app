export * from './eslint';
export * from './tailwind';
export * from './typescript';
export * from './prettier';

// Re-export configurations for easy access
export { default as eslintBase } from './eslint/base.js';
export { default as eslintReact } from './eslint/react.js';
export { default as eslintNode } from './eslint/node.js';
export { default as tailwindBase } from './tailwind/base.js';
export { default as tailwindPreset } from './tailwind/preset.js';
export { default as prettierConfig } from './prettier/index.js';