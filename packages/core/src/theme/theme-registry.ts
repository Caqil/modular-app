import { Types } from 'mongoose';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { Theme, ThemeManifest, ThemeStatus  } from './theme-types';

export interface ThemeRegistryEntry {
  manifest: ThemeManifest;
  instance: Theme | null;
  status: ThemeStatus;
  path: string;
  loadedAt?: Date | undefined;
  errorMessage?: string | undefined;
  isActive: boolean;
}

export class ThemeRegistry {
  private static instance: ThemeRegistry;
  private themes = new Map<string, ThemeRegistryEntry>();
  private activeTheme: string | null = null;
  private logger = new Logger('ThemeRegistry');
  private events = EventManager.getInstance();

  private constructor() {}

  public static getInstance(): ThemeRegistry {
    if (!ThemeRegistry.instance) {
      ThemeRegistry.instance = new ThemeRegistry();
    }
    return ThemeRegistry.instance;
  }

  /**
   * Register a theme
   */
  public register(
    name: string,
    manifest: ThemeManifest,
    path: string,
    instance: Theme | null = null
  ): void {
    const entry: ThemeRegistryEntry = {
      manifest,
      instance,
      status: instance ? ThemeStatus.INSTALLED : ThemeStatus.INACTIVE,
      path,
      loadedAt: instance ? new Date() : undefined,
      isActive: false,
    };

    this.themes.set(name, entry);

    this.logger.info(`Theme registered: ${name}`, {
      version: manifest.version,
      path,
      hasInstance: !!instance,
    });

    // Emit registration event
    this.events.emit('theme:registered', {
      theme: name,
      manifest,
      path,
    });
  }

  /**
   * Unregister a theme
   */
  public unregister(name: string): boolean {
    const entry = this.themes.get(name);
    if (!entry) return false;

    // Can't unregister active theme
    if (entry.isActive) {
      throw new Error('Cannot unregister active theme');
    }

    this.themes.delete(name);

    this.logger.info(`Theme unregistered: ${name}`);

    // Emit unregistration event
    this.events.emit('theme:unregistered', {
      theme: name,
      manifest: entry.manifest,
    });

    return true;
  }

  /**
   * Get theme entry
   */
  public get(name: string): ThemeRegistryEntry | null {
    return this.themes.get(name) || null;
  }

  /**
   * Get theme instance
   */
  public getInstance(name: string): Theme | null {
    const entry = this.themes.get(name);
    return entry?.instance || null;
  }

  /**
   * Get theme manifest
   */
  public getManifest(name: string): ThemeManifest | null {
    const entry = this.themes.get(name);
    return entry?.manifest || null;
  }

  /**
   * Set active theme
   */
  public setActive(name: string): boolean {
    const entry = this.themes.get(name);
    if (!entry) {
      this.logger.error(`Theme not found: ${name}`);
      return false;
    }

    // Deactivate current active theme
    if (this.activeTheme) {
      const currentEntry = this.themes.get(this.activeTheme);
      if (currentEntry) {
        currentEntry.isActive = false;
        currentEntry.status = ThemeStatus.INSTALLED;
      }
    }

    // Activate new theme
    entry.isActive = true;
    entry.status = ThemeStatus.ACTIVE;
    this.activeTheme = name;

    this.logger.info(`Active theme set: ${name}`);

    // Emit activation event
    this.events.emit('theme:activated', {
      theme: name,
      manifest: entry.manifest,
    });

    return true;
  }

  /**
   * Get active theme
   */
  public getActive(): ThemeRegistryEntry | null {
    if (!this.activeTheme) return null;
    return this.themes.get(this.activeTheme) || null;
  }

  /**
   * Get active theme name
   */
  public getActiveName(): string | null {
    return this.activeTheme;
  }

  /**
   * Update theme status
   */
  public updateStatus(name: string, status: ThemeStatus, errorMessage?: string): boolean {
    const entry = this.themes.get(name);
    if (!entry) return false;

    const oldStatus = entry.status;
    entry.status = status;
    entry.errorMessage = errorMessage;

    this.logger.debug(`Theme status updated: ${name}`, {
      oldStatus,
      newStatus: status,
      errorMessage,
    });

    // Emit status change event
    this.events.emit('theme:status_changed', {
      theme: name,
      oldStatus,
      newStatus: status,
      errorMessage,
    });

    return true;
  }

  /**
   * Set theme instance
   */
  public setInstance(name: string, instance: Theme): boolean {
    const entry = this.themes.get(name);
    if (!entry) return false;

    entry.instance = instance;
    entry.loadedAt = new Date();

    this.logger.debug(`Theme instance set: ${name}`);

    return true;
  }

  /**
   * Remove theme instance
   */
  public removeInstance(name: string): boolean {
    const entry = this.themes.get(name);
    if (!entry) return false;

    entry.instance = null;
    entry.loadedAt = undefined;

    this.logger.debug(`Theme instance removed: ${name}`);

    return true;
  }

  /**
   * Check if theme is registered
   */
  public has(name: string): boolean {
    return this.themes.has(name);
  }

  /**
   * Check if theme is installed
   */
  public isInstalled(name: string): boolean {
    const entry = this.themes.get(name);
    return entry?.status !== ThemeStatus.INACTIVE;
  }

  /**
   * Get all registered themes
   */
  public getAll(): Map<string, ThemeRegistryEntry> {
    return new Map(this.themes);
  }

  /**
   * Get themes by status
   */
  public getByStatus(status: ThemeStatus): ThemeRegistryEntry[] {
    return Array.from(this.themes.values()).filter(entry => entry.status === status);
  }

  /**
   * Get installed themes
   */
  public getInstalled(): ThemeRegistryEntry[] {
    return Array.from(this.themes.values()).filter(
      entry => entry.status !== ThemeStatus.INACTIVE
    );
  }

  /**
   * Get themes with errors
   */
  public getWithErrors(): ThemeRegistryEntry[] {
    return this.getByStatus(ThemeStatus.ERROR);
  }

  /**
   * Get theme count by status
   */
  public getStatusCounts(): Record<ThemeStatus, number> {
    const counts = Object.values(ThemeStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<ThemeStatus, number>);

    for (const entry of this.themes.values()) {
      counts[entry.status]++;
    }

    return counts;
  }

  /**
   * Search themes
   */
  public search(query: string): ThemeRegistryEntry[] {
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.themes.values()).filter(entry => {
      const manifest = entry.manifest;
      return (
        manifest.name.toLowerCase().includes(lowercaseQuery) ||
        manifest.title.toLowerCase().includes(lowercaseQuery) ||
        manifest.description.toLowerCase().includes(lowercaseQuery) ||
        manifest.author.toLowerCase().includes(lowercaseQuery) ||
        (manifest.tags && manifest.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
      );
    });
  }

  /**
   * Get themes by support feature
   */
  public getBySupport(support: string): ThemeRegistryEntry[] {
    return Array.from(this.themes.values()).filter(entry => 
      entry.manifest.supports.includes(support as any)
    );
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    total: number;
    active: number;
    installed: number;
    withErrors: number;
    supports: Record<string, number>;
    authors: Record<string, number>;
  } {
    const supports: Record<string, number> = {};
    const authors: Record<string, number> = {};

    for (const entry of this.themes.values()) {
      // Count supports
      for (const support of entry.manifest.supports) {
        supports[support] = (supports[support] || 0) + 1;
      }

      // Count authors
      authors[entry.manifest.author] = (authors[entry.manifest.author] || 0) + 1;
    }

    const statusCounts = this.getStatusCounts();

    return {
      total: this.themes.size,
      active: statusCounts[ThemeStatus.ACTIVE],
      installed: statusCounts[ThemeStatus.INSTALLED],
      withErrors: statusCounts[ThemeStatus.ERROR],
      supports,
      authors,
    };
  }

  /**
   * Clear all registered themes
   */
  public clear(): void {
    this.themes.clear();
    this.activeTheme = null;
    this.logger.info('Theme registry cleared');
  }

  /**
   * Export registry data
   */
  public export(): Record<string, Omit<ThemeRegistryEntry, 'instance'>> {
    const exported: Record<string, Omit<ThemeRegistryEntry, 'instance'>> = {};

    for (const [name, entry] of this.themes.entries()) {
      exported[name] = {
        manifest: entry.manifest,
        status: entry.status,
        path: entry.path,
        loadedAt: entry.loadedAt,
        errorMessage: entry.errorMessage,
        isActive: entry.isActive,
      };
    }

    return exported;
  }

  /**
   * Import registry data
   */
  public import(data: Record<string, Omit<ThemeRegistryEntry, 'instance'>>): void {
    for (const [name, entry] of Object.entries(data)) {
      this.themes.set(name, {
        ...entry,
        instance: null, // Instances need to be loaded separately
      });

      // Set active theme
      if (entry.isActive) {
        this.activeTheme = name;
      }
    }

    this.logger.info(`Imported ${Object.keys(data).length} themes to registry`);
  }
}
