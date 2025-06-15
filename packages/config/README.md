# @modular-app/config

Shared configuration packages for the Modular App monorepo.

## Overview

This package provides consistent configuration for:

- ESLint (JavaScript/TypeScript linting)
- Prettier (Code formatting)
- TypeScript (Type checking)
- Tailwind CSS (Styling)

## Usage

### ESLint

#### For React/Next.js projects:

```javascript
// .eslintrc.js
module.exports = {
  extends: ["@modular-app/config/eslint/react"],
};
```

#### For Node.js projects:

```javascript
// .eslintrc.js
module.exports = {
  extends: ["@modular-app/config/eslint/node"],
};
```

#### For basic TypeScript projects:

```javascript
// .eslintrc.js
module.exports = {
  extends: ["@modular-app/config/eslint/base"],
};
```

### Prettier

```javascript
// prettier.config.js
module.exports = require("@modular-app/config/prettier");
```

### TypeScript

#### For React/Next.js projects:

```json
// tsconfig.json
{
  "extends": "@modular-app/config/typescript/react"
}
```

#### For Node.js projects:

```json
// tsconfig.json
{
  "extends": "@modular-app/config/typescript/node"
}
```

#### For basic TypeScript projects:

```json
// tsconfig.json
{
  "extends": "@modular-app/config/typescript/base"
}
```

### Tailwind CSS

#### Using the base configuration:

```javascript
// tailwind.config.js
module.exports = require("@modular-app/config/tailwind/base");
```

#### Using the preset (recommended):

```javascript
// tailwind.config.js
module.exports = {
  presets: [require("@modular-app/config/tailwind/preset")],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Your custom configuration here
};
```

## Features

### ESLint Features

- **Base Configuration**: TypeScript support, modern ES6+ rules
- **React Configuration**: React, Next.js, and Tailwind CSS rules
- **Node.js Configuration**: Server-side specific rules
- **Consistent Code Quality**: Enforces best practices across all packages

### Prettier Features

- **Consistent Formatting**: Unified code style across the monorepo
- **Tailwind CSS Integration**: Automatic class sorting
- **Import Sorting**: Organized import statements
- **File-Specific Rules**: Different rules for JSON, Markdown, etc.

### TypeScript Features

- **Strict Mode**: Enabled for better type safety
- **Modern Target**: ES2022 with latest features
- **Path Mapping**: Convenient import aliases
- **Optimized for Different Environments**: React, Node.js, and base configurations

### Tailwind CSS Features

- **Design System**: Consistent color palette and spacing
- **Component Library Support**: Pre-configured for Shadcn/ui
- **Dark Mode**: Built-in dark mode support
- **Animations**: Extended animation utilities
- **Responsive Design**: Mobile-first approach

## Development

```bash
# Build the configuration package
pnpm build

# Watch for changes
pnpm dev

# Lint the configuration files
pnpm lint

# Type check
pnpm type-check
```

## Extending Configurations

You can extend any configuration in your specific packages:

```javascript
// apps/web/.eslintrc.js
module.exports = {
  extends: ["@modular-app/config/eslint/react"],
  rules: {
    // Your custom rules here
    "no-console": "off",
  },
};
```

```json
// packages/core/tsconfig.json
{
  "extends": "@modular-app/config/typescript/node",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## Available Configurations

| Package          | Path                                   | Description                |
| ---------------- | -------------------------------------- | -------------------------- |
| ESLint Base      | `@modular-app/config/eslint/base`      | Basic TypeScript rules     |
| ESLint React     | `@modular-app/config/eslint/react`     | React + Next.js rules      |
| ESLint Node      | `@modular-app/config/eslint/node`      | Node.js specific rules     |
| Prettier         | `@modular-app/config/prettier`         | Code formatting rules      |
| TypeScript Base  | `@modular-app/config/typescript/base`  | Basic TypeScript config    |
| TypeScript React | `@modular-app/config/typescript/react` | React TypeScript config    |
| TypeScript Node  | `@modular-app/config/typescript/node`  | Node.js TypeScript config  |
| Tailwind Base    | `@modular-app/config/tailwind/base`    | Base Tailwind config       |
| Tailwind Preset  | `@modular-app/config/tailwind/preset`  | Enhanced preset with theme |
