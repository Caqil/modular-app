#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');

async function generatePlugin() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Plugin name (lowercase, no spaces):',
      validate: (input) => {
        if (!input) return 'Plugin name is required';
        if (!/^[a-z0-9-]+$/.test(input)) return 'Plugin name must be lowercase with hyphens only';
        return true;
      }
    },
    {
      type: 'input',
      name: 'title',
      message: 'Plugin title:',
      validate: (input) => input ? true : 'Plugin title is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Plugin description:',
      validate: (input) => input ? true : 'Plugin description is required'
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author name:',
      default: 'My CMS Team'
    },
    {
      type: 'checkbox',
      name: 'capabilities',
      message: 'Plugin capabilities:',
      choices: [
        'content-management',
        'frontend-rendering',
        'admin-interface',
        'api-endpoints',
        'webhooks',
        'custom-fields',
        'widgets'
      ]
    }
  ]);

  const pluginDir = path.join(__dirname, '..', 'packages', 'plugins', answers.name);
  
  // Check if plugin already exists
  if (await fs.pathExists(pluginDir)) {
    console.error(`Plugin "${answers.name}" already exists!`);
    process.exit(1);
  }

  // Create plugin directory structure
  await fs.ensureDir(pluginDir);
  await fs.ensureDir(path.join(pluginDir, 'src'));
  await fs.ensureDir(path.join(pluginDir, 'src', 'components'));
  await fs.ensureDir(path.join(pluginDir, 'src', 'hooks'));
  await fs.ensureDir(path.join(pluginDir, 'src', 'api'));
  await fs.ensureDir(path.join(pluginDir, 'src', 'models'));
  await fs.ensureDir(path.join(pluginDir, 'src', 'utils'));
  await fs.ensureDir(path.join(pluginDir, 'src', 'types'));
  await fs.ensureDir(path.join(pluginDir, 'admin'));
  await fs.ensureDir(path.join(pluginDir, 'public'));

  // Generate package.json
  const packageJson = {
    name: `@modular-app/plugin-${answers.name}`,
    version: '1.0.0',
    main: './dist/index.js',
    module: './dist/index.mjs',
    types: './dist/index.d.ts',
    scripts: {
      build: 'tsup src/index.ts --format cjs,esm --dts',
      dev: 'tsup src/index.ts --format cjs,esm --dts --watch',
      lint: 'eslint "src/**/*.ts*"',
      'type-check': 'tsc --noEmit',
      clean: 'rm -rf dist'
    },
    dependencies: {
      '@modular-app/core': '*'
    },
    devDependencies: {
      '@modular-app/config': '*',
      tsup: '^7.2.0',
      typescript: '^5.0.0'
    }
  };

  // Generate plugin.json
  const pluginJson = {
    name: answers.name,
    version: '1.0.0',
    title: answers.title,
    description: answers.description,
    author: answers.author,
    license: 'MIT',
    main: 'dist/index.js',
    dependencies: {
      '@modular-app/core': '^0.1.0'
    },
    requirements: {
      cmsVersion: '>=1.0.0',
      nodeVersion: '>=18.0.0'
    },
    capabilities: answers.capabilities
  };

  // Generate plugin main file
  const pluginTs = `import { Plugin } from '@modular-app/core';

export default class ${answers.title.replace(/\s+/g, '')}Plugin extends Plugin {
  async activate(): Promise<void> {
    console.log('${answers.title} plugin activated');
    
    // Initialize your plugin here
  }

  async deactivate(): Promise<void> {
    console.log('${answers.title} plugin deactivated');
    
    // Cleanup your plugin here
  }
}
`;

  // Generate index.ts
  const indexTs = `export { default } from './plugin';
export * from './types';
`;

  // Generate basic types
  const typesTs = `export interface ${answers.title.replace(/\s+/g, '')}Settings {
  // Define your plugin settings here
}
`;

  // Write files
  await fs.writeJson(path.join(pluginDir, 'package.json'), packageJson, { spaces: 2 });
  await fs.writeJson(path.join(pluginDir, 'plugin.json'), pluginJson, { spaces: 2 });
  await fs.writeFile(path.join(pluginDir, 'src', 'plugin.ts'), pluginTs);
  await fs.writeFile(path.join(pluginDir, 'src', 'index.ts'), indexTs);
  await fs.writeFile(path.join(pluginDir, 'src', 'types', 'index.ts'), typesTs);
  
  // Generate README
  const readme = `# ${answers.title} Plugin

${answers.description}

## Installation

This plugin is part of the My CMS monorepo and will be automatically discovered.

## Features

${answers.capabilities.map(cap => `- ${cap.replace(/-/g, ' ')}`).join('\n')}

## Usage

// TODO: Add usage instructions

## Configuration

// TODO: Add configuration options

## API

// TODO: Document API endpoints

## Hooks

// TODO: Document available hooks
`;

  await fs.writeFile(path.join(pluginDir, 'README.md'), readme);

  console.log(`✅ Plugin "${answers.name}" generated successfully!`);
  console.log(`📁 Location: packages/plugins/${answers.name}`);
  console.log(`🚀 Run "pnpm install" to install dependencies`);
  console.log(`🛠️  Run "pnpm build" to build the plugin`);
}

generatePlugin().catch(console.error);
