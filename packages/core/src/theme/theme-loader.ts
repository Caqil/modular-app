import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/logger';
import { Validator } from '../utils/validator';
import { Sanitizer } from '../utils/sanitizer';
import { FileHandler } from '../utils/file-handler';
import type { Theme, ThemeManifest } from './theme-types';

export interface LoadedTheme {
  name: string;
  manifest: ThemeManifest;
  instance: Theme;
  path: string;
  size: number;
  checksum: string;
  screenshot?: string | undefined;
}

export interface ThemeLoadOptions {
  validateManifest: boolean;
  validateCode: boolean;
  allowUnsafe: boolean;
  timeout: number;
  loadAssets: boolean;
}

export class ThemeLoader {
  private static instance: ThemeLoader;
  private logger = new Logger('ThemeLoader');
  private loadedThemes = new Map<string, LoadedTheme>();

  private static readonly DEFAULT_OPTIONS: ThemeLoadOptions = {
    validateManifest: true,
    validateCode: true,
    allowUnsafe: false,
    timeout: 30000, // 30 seconds
    loadAssets: true,
  };

  private constructor() {}

  public static getInstance(): ThemeLoader {
    if (!ThemeLoader.instance) {
      ThemeLoader.instance = new ThemeLoader();
    }
    return ThemeLoader.instance;
  }

  /**
   * Load theme from directory
   */
  public async loadTheme(
    themePath: string,
    options: Partial<ThemeLoadOptions> = {}
  ): Promise<LoadedTheme> {
    const config = { ...ThemeLoader.DEFAULT_OPTIONS, ...options };
    
    this.logger.info(`Loading theme from: ${themePath}`);

    try {
      // Validate theme directory
      await this.validateThemeDirectory(themePath);

      // Load and validate manifest
      const manifest = await this.loadManifest(themePath, config);

      // Load theme code
      const instance = await this.loadThemeCode(themePath, manifest, config);

      // Get theme metadata
      const size = await this.calculateDirectorySize(themePath);
      const checksum = await this.calculateThemeChecksum(themePath);
      const screenshot = await this.findScreenshot(themePath);

      const loadedTheme: LoadedTheme = {
        name: manifest.name,
        manifest,
        instance,
        path: themePath,
        size,
        checksum,
        screenshot,
      };

      // Cache loaded theme
      this.loadedThemes.set(manifest.name, loadedTheme);

      this.logger.info(`Theme loaded successfully: ${manifest.name} v${manifest.version}`);

      return loadedTheme;
    } catch (error) {
      this.logger.error(`Failed to load theme from ${themePath}:`, error);
      throw error;
    }
  }

  /**
   * Load multiple themes from directory
   */
  public async loadThemesFromDirectory(
    themesDir: string,
    options: Partial<ThemeLoadOptions> = {}
  ): Promise<LoadedTheme[]> {
    this.logger.info(`Loading themes from directory: ${themesDir}`);

    const loadedThemes: LoadedTheme[] = [];

    try {
      // Check if directory exists
      if (!(await fs.pathExists(themesDir))) {
        this.logger.warn(`Themes directory does not exist: ${themesDir}`);
        return loadedThemes;
      }

      // Read theme directories
      const entries = await fs.readdir(themesDir, { withFileTypes: true });
      const themeDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

      this.logger.info(`Found ${themeDirs.length} potential theme directories`);

      // Load each theme
      for (const themeDir of themeDirs) {
        const themePath = path.join(themesDir, themeDir);
        
        try {
          const theme = await this.loadTheme(themePath, options);
          loadedThemes.push(theme);
        } catch (error) {
          this.logger.error(`Failed to load theme from ${themeDir}:`, error);
          // Continue loading other themes
        }
      }

      this.logger.info(`Successfully loaded ${loadedThemes.length} themes`);

      return loadedThemes;
    } catch (error) {
      this.logger.error(`Error loading themes from directory ${themesDir}:`, error);
      throw error;
    }
  }

  /**
   * Unload theme
   */
  public async unloadTheme(name: string): Promise<boolean> {
    const theme = this.loadedThemes.get(name);
    if (!theme) {
      this.logger.warn(`Theme not found for unloading: ${name}`);
      return false;
    }

    try {
      // Call theme's deactivate method if it exists
      if (theme.instance.deactivate) {
        await theme.instance.deactivate();
      }

      // Remove from cache
      this.loadedThemes.delete(name);

      // Clear module cache
      this.clearModuleCache(theme.path);

      this.logger.info(`Theme unloaded: ${name}`);
      return true;
    } catch (error) {
      this.logger.error(`Error unloading theme ${name}:`, error);
      throw error;
    }
  }

  /**
   * Reload theme
   */
  public async reloadTheme(name: string, options?: Partial<ThemeLoadOptions>): Promise<LoadedTheme> {
    const theme = this.loadedThemes.get(name);
    if (!theme) {
      throw new Error(`Theme not found for reloading: ${name}`);
    }

    // Unload first
    await this.unloadTheme(name);

    // Load again
    return this.loadTheme(theme.path, options);
  }

  /**
   * Get loaded theme
   */
  public getLoadedTheme(name: string): LoadedTheme | null {
    return this.loadedThemes.get(name) || null;
  }

  /**
   * Get all loaded themes
   */
  public getAllLoadedThemes(): LoadedTheme[] {
    return Array.from(this.loadedThemes.values());
  }

  /**
   * Check if theme is loaded
   */
  public isThemeLoaded(name: string): boolean {
    return this.loadedThemes.has(name);
  }

  /**
   * Get theme asset
   */
  public async getThemeAsset(themeName: string, assetPath: string): Promise<string | null> {
    const theme = this.loadedThemes.get(themeName);
    if (!theme) return null;

    const fullAssetPath = path.join(theme.path, 'assets', assetPath);
    
    try {
      if (await fs.pathExists(fullAssetPath)) {
        return await fs.readFile(fullAssetPath, 'utf-8');
      }
    } catch (error) {
      this.logger.error(`Error reading theme asset ${assetPath}:`, error);
    }

    return null;
  }

  /**
   * Get theme template
   */
  public async getThemeTemplate(themeName: string, templateName: string): Promise<string | null> {
    const theme = this.loadedThemes.get(themeName);
    if (!theme) return null;

    const template = theme.manifest.templates[templateName];
    if (!template) return null;

    const templatePath = path.join(theme.path, 'src/templates', template.file);
    
    try {
      if (await fs.pathExists(templatePath)) {
        return await fs.readFile(templatePath, 'utf-8');
      }
    } catch (error) {
      this.logger.error(`Error reading theme template ${templateName}:`, error);
    }

    return null;
  }

  /**
   * Validate theme directory structure
   */
  private async validateThemeDirectory(themePath: string): Promise<void> {
    // Check if directory exists
    if (!(await fs.pathExists(themePath))) {
      throw new Error(`Theme directory does not exist: ${themePath}`);
    }

    // Check if it's a directory
    const stats = await fs.stat(themePath);
    if (!stats.isDirectory()) {
      throw new Error(`Theme path is not a directory: ${themePath}`);
    }

    // Check for required files
    const manifestPath = path.join(themePath, 'theme.json');
    if (!(await fs.pathExists(manifestPath))) {
      throw new Error(`Theme manifest not found: ${manifestPath}`);
    }

    const packagePath = path.join(themePath, 'package.json');
    if (!(await fs.pathExists(packagePath))) {
      throw new Error(`Package.json not found: ${packagePath}`);
    }
  }

  /**
   * Load and validate theme manifest
   */
  private async loadManifest(
    themePath: string,
    options: ThemeLoadOptions
  ): Promise<ThemeManifest> {
    const manifestPath = path.join(themePath, 'theme.json');

    try {
      // Read manifest file
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      
      // Sanitize JSON content
      const sanitizedContent = Sanitizer.sanitizeJson(manifestContent);
      if (!sanitizedContent) {
        throw new Error('Invalid JSON in theme manifest');
      }

      const manifest = sanitizedContent as ThemeManifest;

      // Validate manifest if required
      if (options.validateManifest) {
        const validation = Validator.validate(Validator.themeManifestSchema, manifest);
        if (!validation.success) {
          throw new Error(`Invalid theme manifest: ${validation.errors.message}`);
        }
      }

      // Sanitize manifest fields
      manifest.name = Sanitizer.sanitizeText(manifest.name);
      manifest.title = Sanitizer.sanitizeText(manifest.title);
      manifest.description = Sanitizer.sanitizeText(manifest.description);
      manifest.author = Sanitizer.sanitizeText(manifest.author);

      if (manifest.homepage) {
        manifest.homepage = Sanitizer.sanitizeUrl(manifest.homepage);
      }

      if (manifest.repository) {
        manifest.repository = Sanitizer.sanitizeUrl(manifest.repository);
      }

      return manifest;
    } catch (error) {
      throw new Error(`Failed to load theme manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load theme code
   */
  private async loadThemeCode(
    themePath: string,
    manifest: ThemeManifest,
    options: ThemeLoadOptions
  ): Promise<Theme> {
    const mainPath = path.resolve(themePath, 'src/index.ts');

    try {
      // Check if main file exists
      if (!(await fs.pathExists(mainPath))) {
        throw new Error(`Theme main file not found: ${mainPath}`);
      }

      // Security check - ensure main file is within theme directory
      if (!mainPath.startsWith(path.resolve(themePath))) {
        throw new Error('Theme main file is outside theme directory');
      }

      // Clear module cache for hot reloading
      this.clearModuleCache(mainPath);

      // Load theme module with timeout
      const themeModule = await this.loadModuleWithTimeout(mainPath, options.timeout);

      // Get theme class
      const ThemeClass = themeModule.default || themeModule;
      if (typeof ThemeClass !== 'function') {
        throw new Error('Theme must export a class as default export');
      }

      // Create theme instance
      const instance = new ThemeClass();

      // Validate theme instance
      if (!this.isValidThemeInstance(instance)) {
        throw new Error('Theme instance does not implement required interface');
      }

      // Set manifest reference
      instance.manifest = manifest;
      instance.path = themePath;

      return instance;
    } catch (error) {
      throw new Error(`Failed to load theme code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load module with timeout
   */
  private async loadModuleWithTimeout(modulePath: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Theme loading timeout after ${timeout}ms`));
      }, timeout);

      try {
        const module = require(modulePath);
        clearTimeout(timer);
        resolve(module);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Validate theme instance
   */
  private isValidThemeInstance(instance: any): instance is Theme {
    return (
      instance &&
      typeof instance === 'object' &&
      (typeof instance.activate === 'function' || instance.activate === undefined) &&
      (typeof instance.deactivate === 'function' || instance.deactivate === undefined)
    );
  }

  /**
   * Clear module cache
   */
  private clearModuleCache(modulePath: string): void {
    const resolvedPath = require.resolve(modulePath);
    
    // Delete from require cache
    delete require.cache[resolvedPath];

    // Also clear related modules in the same directory
    const moduleDir = path.dirname(resolvedPath);
    Object.keys(require.cache).forEach(key => {
      if (key.startsWith(moduleDir)) {
        delete require.cache[key];
      }
    });
  }

  /**
   * Calculate directory size
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        totalSize += await this.calculateDirectorySize(itemPath);
      } else {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  /**
   * Calculate theme checksum
   */
  private async calculateThemeChecksum(themePath: string): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');

    // Hash the manifest file
    const manifestPath = path.join(themePath, 'theme.json');
    const manifestContent = await fs.readFile(manifestPath);
    hash.update(manifestContent);

    // Hash the main theme files
    const srcPath = path.join(themePath, 'src');
    if (await fs.pathExists(srcPath)) {
      const files = await fs.readdir(srcPath);
      for (const file of files) {
        const filePath = path.join(srcPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          const content = await fs.readFile(filePath);
          hash.update(content);
        }
      }
    }

    return hash.digest('hex');
  }

  /**
   * Find theme screenshot
   */
  private async findScreenshot(themePath: string): Promise<string | undefined> {
    const possibleScreenshots = [
      'screenshot.png',
      'screenshot.jpg',
      'screenshot.jpeg',
      'preview.png',
      'preview.jpg',
    ];

    for (const screenshot of possibleScreenshots) {
      const screenshotPath = path.join(themePath, screenshot);
      if (await fs.pathExists(screenshotPath)) {
        return screenshot;
      }
    }

    return undefined;
  }

  /**
   * Get loader statistics
   */
  public getStats(): {
    loadedCount: number;
    totalSize: number;
    themes: Array<{
      name: string;
      version: string;
      size: number;
      path: string;
    }>;
  } {
    const themes = Array.from(this.loadedThemes.values());
    
    return {
      loadedCount: themes.length,
      totalSize: themes.reduce((total, theme) => total + theme.size, 0),
      themes: themes.map(theme => ({
        name: theme.name,
        version: theme.manifest.version,
        size: theme.size,
        path: theme.path,
      })),
    };
  }

  /**
   * Clear all loaded themes
   */
  public async clearAll(): Promise<void> {
    const themeNames = Array.from(this.loadedThemes.keys());
    
    for (const name of themeNames) {
      await this.unloadTheme(name);
    }

    this.logger.info('All themes cleared from loader');
  }
}