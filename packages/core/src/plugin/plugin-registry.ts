import { Types } from 'mongoose';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import { Plugin, PluginCapability, PluginManifest, PluginStatus } from './plugin-types';
export interface PluginRegistryEntry {
  manifest: PluginManifest;
  instance: Plugin | null;
  status: PluginStatus;
  path: string;
  loadedAt?: Date | undefined;
  errorMessage?: string | undefined;
}

export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins = new Map<string, PluginRegistryEntry>();
  private logger = new Logger('PluginRegistry');
  private events = EventManager.getInstance();

  private constructor() {}

  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Register a plugin
   */
  public register(
    name: string,
    manifest: PluginManifest,
    path: string,
    instance: Plugin | null = null
  ): void {
    const entry: PluginRegistryEntry = {
      manifest,
      instance,
      status: instance ? PluginStatus.INSTALLED : PluginStatus.INACTIVE,
      path,
      loadedAt: instance ? new Date() : undefined,
    };

    this.plugins.set(name, entry);

    this.logger.info(`Plugin registered: ${name}`, {
      version: manifest.version,
      path,
      hasInstance: !!instance,
    });

    // Emit registration event
    this.events.emit('plugin:registered', {
      plugin: name,
      manifest,
      path,
    });
  }

  /**
   * Unregister a plugin
   */
  public unregister(name: string): boolean {
    const entry = this.plugins.get(name);
    if (!entry) return false;

    this.plugins.delete(name);

    this.logger.info(`Plugin unregistered: ${name}`);

    // Emit unregistration event
    this.events.emit('plugin:unregistered', {
      plugin: name,
      manifest: entry.manifest,
    });

    return true;
  }

  /**
   * Get plugin entry
   */
  public get(name: string): PluginRegistryEntry | null {
    return this.plugins.get(name) || null;
  }

  /**
   * Get plugin instance
   */
  public getInstance(name: string): Plugin | null {
    const entry = this.plugins.get(name);
    return entry?.instance || null;
  }

  /**
   * Get plugin manifest
   */
  public getManifest(name: string): PluginManifest | null {
    const entry = this.plugins.get(name);
    return entry?.manifest || null;
  }

  /**
   * Update plugin status
   */
  public updateStatus(name: string, status: PluginStatus, errorMessage?: string): boolean {
    const entry = this.plugins.get(name);
    if (!entry) return false;

    const oldStatus = entry.status;
    entry.status = status;
    entry.errorMessage = errorMessage;

    this.logger.debug(`Plugin status updated: ${name}`, {
      oldStatus,
      newStatus: status,
      errorMessage,
    });

    // Emit status change event
    this.events.emit('plugin:status_changed', {
      plugin: name,
      oldStatus,
      newStatus: status,
      errorMessage,
    });

    return true;
  }

  /**
   * Set plugin instance
   */
  public setInstance(name: string, instance: Plugin): boolean {
    const entry = this.plugins.get(name);
    if (!entry) return false;

    entry.instance = instance;
    entry.loadedAt = new Date();

    this.logger.debug(`Plugin instance set: ${name}`);

    return true;
  }

  /**
   * Remove plugin instance
   */
  public removeInstance(name: string): boolean {
    const entry = this.plugins.get(name);
    if (!entry) return false;

    entry.instance = null;
    entry.loadedAt = undefined;

    this.logger.debug(`Plugin instance removed: ${name}`);

    return true;
  }

  /**
   * Check if plugin is registered
   */
  public has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Check if plugin is active
   */
  public isActive(name: string): boolean {
    const entry = this.plugins.get(name);
    return entry?.status === PluginStatus.ACTIVE;
  }

  /**
   * Check if plugin is installed
   */
  public isInstalled(name: string): boolean {
    const entry = this.plugins.get(name);
    return entry?.status !== PluginStatus.INACTIVE;
  }

  /**
   * Get all registered plugins
   */
  public getAll(): Map<string, PluginRegistryEntry> {
    return new Map(this.plugins);
  }

  /**
   * Get plugins by status
   */
  public getByStatus(status: PluginStatus): PluginRegistryEntry[] {
    return Array.from(this.plugins.values()).filter(entry => entry.status === status);
  }

  /**
   * Get active plugins
   */
  public getActive(): PluginRegistryEntry[] {
    return this.getByStatus(PluginStatus.ACTIVE);
  }

  /**
   * Get installed plugins
   */
  public getInstalled(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values()).filter(
      entry => entry.status !== PluginStatus.INACTIVE
    );
  }

  /**
   * Get plugins with errors
   */
  public getWithErrors(): PluginRegistryEntry[] {
    return this.getByStatus(PluginStatus.ERROR);
  }

  /**
   * Get plugin count by status
   */
  public getStatusCounts(): Record<PluginStatus, number> {
    const counts = Object.values(PluginStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<PluginStatus, number>);

    for (const entry of this.plugins.values()) {
      counts[entry.status]++;
    }

    return counts;
  }

  /**
   * Search plugins
   */
  public search(query: string): PluginRegistryEntry[] {
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.plugins.values()).filter(entry => {
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
   * Get plugins by capability
   */
  public getByCapability(capability: PluginCapability): PluginRegistryEntry[] {
    return Array.from(this.plugins.values()).filter(entry => 
      entry.manifest.capabilities.includes(capability)
    );
  }

  /**
   * Check plugin dependencies
   */
  public checkDependencies(name: string): {
    satisfied: boolean;
    missing: string[];
    conflicts: string[];
  } {
    const entry = this.plugins.get(name);
    if (!entry) {
      return { satisfied: false, missing: [name], conflicts: [] };
    }

    const missing: string[] = [];
    const conflicts: string[] = [];

    // Check required dependencies
    if (entry.manifest.dependencies) {
      for (const [depName, depVersion] of Object.entries(entry.manifest.dependencies)) {
        const depEntry = this.plugins.get(depName);
        
        if (!depEntry) {
          missing.push(depName);
        } else if (!this.isVersionCompatible(depEntry.manifest.version, depVersion)) {
          conflicts.push(`${depName} version ${depEntry.manifest.version} (required: ${depVersion})`);
        }
      }
    }

    return {
      satisfied: missing.length === 0 && conflicts.length === 0,
      missing,
      conflicts,
    };
  }

  /**
   * Check version compatibility
   */
  private isVersionCompatible(current: string, required: string): boolean {
    // Simple version comparison - can be enhanced with semver
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.replace(/[^\d.]/g, '').split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;

      if (currentPart > requiredPart) return true;
      if (currentPart < requiredPart) return false;
    }

    return true; // Versions are equal
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    total: number;
    active: number;
    installed: number;
    withErrors: number;
    capabilities: Record<string, number>;
    authors: Record<string, number>;
  } {
    const capabilities: Record<string, number> = {};
    const authors: Record<string, number> = {};

    for (const entry of this.plugins.values()) {
      // Count capabilities
      for (const capability of entry.manifest.capabilities) {
        capabilities[capability] = (capabilities[capability] || 0) + 1;
      }

      // Count authors
      authors[entry.manifest.author] = (authors[entry.manifest.author] || 0) + 1;
    }

    const statusCounts = this.getStatusCounts();

    return {
      total: this.plugins.size,
      active: statusCounts[PluginStatus.ACTIVE],
      installed: statusCounts[PluginStatus.INSTALLED],
      withErrors: statusCounts[PluginStatus.ERROR],
      capabilities,
      authors,
    };
  }

  /**
   * Clear all registered plugins
   */
  public clear(): void {
    this.plugins.clear();
    this.logger.info('Plugin registry cleared');
  }

  /**
   * Export registry data
   */
  public export(): Record<string, Omit<PluginRegistryEntry, 'instance'>> {
    const exported: Record<string, Omit<PluginRegistryEntry, 'instance'>> = {};

    for (const [name, entry] of this.plugins.entries()) {
      exported[name] = {
        manifest: entry.manifest,
        status: entry.status,
        path: entry.path,
        loadedAt: entry.loadedAt,
        errorMessage: entry.errorMessage,
      };
    }

    return exported;
  }

  /**
   * Import registry data
   */
  public import(data: Record<string, Omit<PluginRegistryEntry, 'instance'>>): void {
    for (const [name, entry] of Object.entries(data)) {
      this.plugins.set(name, {
        ...entry,
        instance: null, // Instances need to be loaded separately
      });
    }

    this.logger.info(`Imported ${Object.keys(data).length} plugins to registry`);
  }
}