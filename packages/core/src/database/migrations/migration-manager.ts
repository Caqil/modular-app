import { Schema, model, Document, Types } from 'mongoose';
import path from 'path';
import { Logger } from '../../utils/logger';
import { EventManager } from '../../events/event-manager';
import { EventType } from '../../events/event-types';
import { Migration } from '../../types/database';
import { fs } from 'fs-extra';
// Migration record interface for database storage
export interface IMigrationRecord extends Document {
  version: string;
  name: string;
  batch: number;
  executedAt: Date;
  executionTime: number;
  checksum: string;
  rollbackAvailable: boolean;
}

// Migration schema for tracking executed migrations
const MigrationRecordSchema = new Schema<IMigrationRecord>({
  version: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^\d{4}_\d{2}_\d{2}_\d{6}$/.test(v);
      },
      message: 'Version must be in format YYYY_MM_DD_HHMMSS'
    }
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  batch: {
    type: Number,
    required: true,
    min: 1,
  },
  executedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  executionTime: {
    type: Number,
    required: true,
    min: 0,
  },
  checksum: {
    type: String,
    required: true,
    trim: true,
  },
  rollbackAvailable: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: false,
  collection: 'migrations'
});

// Indexes
MigrationRecordSchema.index({ version: 1 });
MigrationRecordSchema.index({ batch: 1 });
MigrationRecordSchema.index({ executedAt: 1 });

export const MigrationRecordModel = model<IMigrationRecord>('Migration', MigrationRecordSchema);

// Migration file interface
export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  filePath: string;
  checksum: string;
  migration: Migration;
}

// Migration status
export enum MigrationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

// Migration execution result
export interface MigrationResult {
  version: string;
  name: string;
  status: MigrationStatus;
  executionTime: number;
  error?: string;
  rollbackAvailable: boolean;
}

// Migration batch result
export interface MigrationBatchResult {
  batch: number;
  total: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
  totalTime: number;
}

// Migration manager configuration
export interface MigrationManagerConfig {
  migrationsPath: string;
  tableName?: string;
  dryRun?: boolean;
  timeout?: number;
  lockTimeout?: number;
}

/**
 * Database migration manager
 * Handles running, rolling back, and tracking database migrations
 */
export class MigrationManager {
  private logger: Logger;
  private events: EventManager;
  private config: Required<MigrationManagerConfig>;
  private isLocked: boolean = false;
  private lockStartTime?: Date | undefined;

  constructor(config: MigrationManagerConfig) {
    this.logger = new Logger('MigrationManager');
    this.events = EventManager.getInstance();
    
    // Set default configuration
    this.config = {
      migrationsPath: config.migrationsPath,
      tableName: config.tableName || 'migrations',
      dryRun: config.dryRun || false,
      timeout: config.timeout || 30000, // 30 seconds
      lockTimeout: config.lockTimeout || 300000, // 5 minutes
    };
  }

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing migration manager...');

      // Ensure migrations collection exists and has proper indexes
      await MigrationRecordModel.createIndexes();

      // Verify migrations directory exists
      await this.ensureMigrationsDirectory();

      this.logger.info('Migration manager initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing migration manager:', error);
      throw error;
    }
  }

  /**
   * Run pending migrations
   */
  async migrate(options: { target?: string; force?: boolean } = {}): Promise<MigrationBatchResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting migration process...');

      // Acquire lock
      await this.acquireLock();

      // Get pending migrations
      const pendingMigrations = await this.getPendingMigrations(options.target);
      
      if (pendingMigrations.length === 0) {
        this.logger.info('No pending migrations found');
        return {
          batch: await this.getNextBatchNumber(),
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
          totalTime: Date.now() - startTime,
        };
      }

      this.logger.info(`Found ${pendingMigrations.length} pending migrations`);

      const batch = await this.getNextBatchNumber();
      const results: MigrationResult[] = [];
      let successful = 0;
      let failed = 0;

      // Execute migrations
      for (const migrationFile of pendingMigrations) {
        try {
          const result = await this.executeMigration(migrationFile, batch);
          results.push(result);

          if (result.status === MigrationStatus.COMPLETED) {
            successful++;
          } else {
            failed++;
          }

          // Stop on first failure unless force is true
          if (result.status === MigrationStatus.FAILED && !options.force) {
            this.logger.error('Migration failed, stopping execution');
            break;
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          results.push({
            version: migrationFile.version,
            name: migrationFile.name,
            status: MigrationStatus.FAILED,
            executionTime: 0,
            error: errorMessage,
            rollbackAvailable: false,
          });
          
          failed++;

          if (!options.force) {
            break;
          }
        }
      }

      const totalTime = Date.now() - startTime;
      const batchResult: MigrationBatchResult = {
        batch,
        total: pendingMigrations.length,
        successful,
        failed,
        results,
        totalTime,
      };

      await this.events.emit(EventType.DATABASE_MIGRATION, {
        type: 'batch_completed',
        batch: batchResult,
        timestamp: new Date(),
      });

      this.logger.info('Migration batch completed', {
        batch,
        total: pendingMigrations.length,
        successful,
        failed,
        totalTime,
      });

      return batchResult;

    } catch (error) {
      this.logger.error('Error during migration:', error);
      throw error;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(options: { steps?: number; target?: string; force?: boolean } = {}): Promise<MigrationBatchResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting rollback process...');

      // Acquire lock
      await this.acquireLock();

      // Get migrations to rollback
      const migrationsToRollback = await this.getMigrationsToRollback(options);

      if (migrationsToRollback.length === 0) {
        this.logger.info('No migrations to rollback');
        return {
          batch: 0,
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
          totalTime: Date.now() - startTime,
        };
      }

      this.logger.info(`Rolling back ${migrationsToRollback.length} migrations`);

      const results: MigrationResult[] = [];
      let successful = 0;
      let failed = 0;

      // Execute rollbacks in reverse order
      for (const record of migrationsToRollback.reverse()) {
        try {
          const result = await this.rollbackMigration(record);
          results.push(result);

          if (result.status === MigrationStatus.ROLLED_BACK) {
            successful++;
          } else {
            failed++;
          }

          // Stop on first failure unless force is true
          if (result.status === MigrationStatus.FAILED && !options.force) {
            this.logger.error('Rollback failed, stopping execution');
            break;
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          results.push({
            version: record.version,
            name: record.name,
            status: MigrationStatus.FAILED,
            executionTime: 0,
            error: errorMessage,
            rollbackAvailable: false,
          });
          
          failed++;

          if (!options.force) {
            break;
          }
        }
      }

      const totalTime = Date.now() - startTime;
      const batchResult: MigrationBatchResult = {
        batch: 0, // Rollbacks don't have batch numbers
        total: migrationsToRollback.length,
        successful,
        failed,
        results,
        totalTime,
      };

      await this.events.emit(EventType.DATABASE_MIGRATION, {
        type: 'rollback_completed',
        batch: batchResult,
        timestamp: new Date(),
      });

      this.logger.info('Rollback completed', {
        total: migrationsToRollback.length,
        successful,
        failed,
        totalTime,
      });

      return batchResult;

    } catch (error) {
      this.logger.error('Error during rollback:', error);
      throw error;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    executed: IMigrationRecord[];
    pending: MigrationFile[];
    total: number;
    lastBatch?: number;
    lastExecuted?: Date;
  }> {
    try {
      // Get executed migrations
      const executed = await MigrationRecordModel
        .find()
        .sort({ version: 1 })
        .lean();

      // Get all migration files
      const allMigrations = await this.loadMigrationFiles();
      
      // Find pending migrations
      const executedVersions = new Set(executed.map(m => m.version));
      const pending = allMigrations.filter(m => !executedVersions.has(m.version));

      // Get last batch info
      const lastExecuted = executed.length > 0 ? executed[executed.length - 1] : undefined;

      const result: {
        executed: IMigrationRecord[];
        pending: MigrationFile[];
        total: number;
        lastBatch?: number;
        lastExecuted?: Date;
      } = {
        executed,
        pending,
        total: allMigrations.length,
      };

      if (lastExecuted?.batch !== undefined) {
        result.lastBatch = lastExecuted.batch;
      }
      if (lastExecuted?.executedAt !== undefined) {
        result.lastExecuted = lastExecuted.executedAt;
      }

      return result;

    } catch (error) {
      this.logger.error('Error getting migration status:', error);
      throw error;
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string, template?: 'basic' | 'table' | 'index'): Promise<string> {
    try {
      const version = this.generateVersion();
      const filename = `${version}_${this.sanitizeName(name)}.ts`;
      const filePath = path.join(this.config.migrationsPath, filename);

      const content = this.generateMigrationTemplate(name, template || 'basic');

      await fs.writeFile(filePath, content, 'utf8');

      this.logger.info(`Created migration: ${filename}`);

      return filePath;
    } catch (error) {
      this.logger.error('Error creating migration:', error);
      throw error;
    }
  }

  /**
   * Reset all migrations (dangerous!)
   */
  async reset(confirm: boolean = false): Promise<void> {
    if (!confirm) {
      throw new Error('Reset operation requires explicit confirmation');
    }

    try {
      this.logger.warn('Resetting all migrations...');

      await this.acquireLock();

      // Delete all migration records
      await MigrationRecordModel.deleteMany({});

      this.logger.warn('All migration records deleted');

      await this.events.emit(EventType.DATABASE_MIGRATION, {
        type: 'reset',
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Error resetting migrations:', error);
      throw error;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migrationFile: MigrationFile, batch: number): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`Executing migration: ${migrationFile.name}`);

      if (this.config.dryRun) {
        this.logger.info('DRY RUN: Migration would be executed');
        return {
          version: migrationFile.version,
          name: migrationFile.name,
          status: MigrationStatus.COMPLETED,
          executionTime: Date.now() - startTime,
          rollbackAvailable: typeof migrationFile.migration.down === 'function',
        };
      }

      // Execute the migration with timeout
      await this.executeWithTimeout(
        migrationFile.migration.up.bind(migrationFile.migration),
        this.config.timeout
      );

      const executionTime = Date.now() - startTime;

      // Record the migration
      await MigrationRecordModel.create({
        version: migrationFile.version,
        name: migrationFile.name,
        batch,
        executedAt: new Date(),
        executionTime,
        checksum: migrationFile.checksum,
        rollbackAvailable: typeof migrationFile.migration.down === 'function',
      });

      await this.events.emit(EventType.DATABASE_MIGRATION, {
        type: 'migration_executed',
        version: migrationFile.version,
        name: migrationFile.name,
        executionTime,
        timestamp: new Date(),
      });

      this.logger.info(`Migration completed: ${migrationFile.name} (${executionTime}ms)`);

      return {
        version: migrationFile.version,
        name: migrationFile.name,
        status: MigrationStatus.COMPLETED,
        executionTime,
        rollbackAvailable: typeof migrationFile.migration.down === 'function',
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Migration failed: ${migrationFile.name}`, error);

      await this.events.emit(EventType.DATABASE_MIGRATION, {
        type: 'migration_failed',
        version: migrationFile.version,
        name: migrationFile.name,
        error: errorMessage,
        executionTime,
        timestamp: new Date(),
      });

      return {
        version: migrationFile.version,
        name: migrationFile.name,
        status: MigrationStatus.FAILED,
        executionTime,
        error: errorMessage,
        rollbackAvailable: false,
      };
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(record: IMigrationRecord): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`Rolling back migration: ${record.name}`);

      if (!record.rollbackAvailable) {
        throw new Error('Rollback not available for this migration');
      }

      // Load the migration file
      const migrationFile = await this.loadMigrationFile(record.version);
      
      if (!migrationFile.migration.down) {
        throw new Error('Rollback method not implemented');
      }

      if (this.config.dryRun) {
        this.logger.info('DRY RUN: Migration would be rolled back');
        return {
          version: record.version,
          name: record.name,
          status: MigrationStatus.ROLLED_BACK,
          executionTime: Date.now() - startTime,
          rollbackAvailable: true,
        };
      }

      // Execute the rollback with timeout
      await this.executeWithTimeout(
        migrationFile.migration.down.bind(migrationFile.migration),
        this.config.timeout
      );

      const executionTime = Date.now() - startTime;

      // Remove the migration record
      await MigrationRecordModel.deleteOne({ version: record.version });

      await this.events.emit(EventType.DATABASE_MIGRATION, {
        type: 'migration_rolled_back',
        version: record.version,
        name: record.name,
        executionTime,
        timestamp: new Date(),
      });

      this.logger.info(`Migration rolled back: ${record.name} (${executionTime}ms)`);

      return {
        version: record.version,
        name: record.name,
        status: MigrationStatus.ROLLED_BACK,
        executionTime,
        rollbackAvailable: true,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Rollback failed: ${record.name}`, error);

      return {
        version: record.version,
        name: record.name,
        status: MigrationStatus.FAILED,
        executionTime,
        error: errorMessage,
        rollbackAvailable: false,
      };
    }
  }

  /**
   * Load all migration files
   */
  private async loadMigrationFiles(): Promise<MigrationFile[]> {
    try {
      const files = await fs.readdir(this.config.migrationsPath);
      const migrationFiles: MigrationFile[] = [];

      for (const filename of files) {
        if (filename.endsWith('.ts') || filename.endsWith('.js')) {
          try {
            const migrationFile = await this.loadMigrationFile(filename);
            migrationFiles.push(migrationFile);
          } catch (error) {
            this.logger.warn(`Failed to load migration file ${filename}:`, error);
          }
        }
      }

      // Sort by version
      migrationFiles.sort((a, b) => a.version.localeCompare(b.version));

      return migrationFiles;
    } catch (error) {
      this.logger.error('Error loading migration files:', error);
      throw error;
    }
  }

  /**
   * Load a specific migration file
   */
  private async loadMigrationFile(versionOrFilename: string): Promise<MigrationFile> {
    try {
      let filename = versionOrFilename;
      
      // If version is provided, find the corresponding file
      if (!filename.includes('.')) {
        const files = await fs.readdir(this.config.migrationsPath);
        const matchingFile = files.find(f => f.startsWith(versionOrFilename));
        
        if (!matchingFile) {
          throw new Error(`Migration file not found for version: ${versionOrFilename}`);
        }
        
        filename = matchingFile;
      }

      const filePath = path.join(this.config.migrationsPath, filename);
      const version = filename.split('_').slice(0, 4).join('_');
      const name = filename.replace(/^\d{4}_\d{2}_\d{2}_\d{6}_/, '').replace(/\.(ts|js)$/, '');

      // Calculate file checksum
      const fileContent = await fs.readFile(filePath, 'utf8');
      const checksum = this.calculateChecksum(fileContent);

      // Dynamically import the migration
      const migrationModule = await import(filePath);
      const migration: Migration = migrationModule.default || migrationModule;

      if (!migration.up || typeof migration.up !== 'function') {
        throw new Error('Migration must export an up method');
      }

      return {
        version,
        name,
        filename,
        filePath,
        checksum,
        migration,
      };

    } catch (error) {
      this.logger.error(`Error loading migration file ${versionOrFilename}:`, error);
      throw error;
    }
  }

  /**
   * Get pending migrations
   */
  private async getPendingMigrations(target?: string): Promise<MigrationFile[]> {
    const allMigrations = await this.loadMigrationFiles();
    const executedMigrations = await MigrationRecordModel.find().lean();
    const executedVersions = new Set(executedMigrations.map(m => m.version));

    let pendingMigrations = allMigrations.filter(m => !executedVersions.has(m.version));

    // Filter by target if specified
    if (target) {
      const targetIndex = pendingMigrations.findIndex(m => m.version === target);
      if (targetIndex === -1) {
        throw new Error(`Target migration not found: ${target}`);
      }
      pendingMigrations = pendingMigrations.slice(0, targetIndex + 1);
    }

    return pendingMigrations;
  }

  /**
   * Get migrations to rollback
   */
  private async getMigrationsToRollback(options: { steps?: number; target?: string }): Promise<IMigrationRecord[]> {
    let query = MigrationRecordModel.find().sort({ version: -1 });

    if (options.target) {
      // Rollback to specific target (exclusive)
      query = query.where('version').where({ $gt: options.target });
    } else if (options.steps) {
      // Rollback specific number of steps
      query = query.limit(options.steps);
    } else {
      // Default: rollback last batch
      const lastBatch = await MigrationRecordModel
        .findOne()
        .sort({ batch: -1 })
        .select('batch')
        .lean();

      if (lastBatch) {
        query = query.where('batch').equals(lastBatch.batch);
      }
    }

    return await query.lean();
  }

  /**
   * Get next batch number
   */
  private async getNextBatchNumber(): Promise<number> {
    const lastRecord = await MigrationRecordModel
      .findOne()
      .sort({ batch: -1 })
      .select('batch')
      .lean();

    return (lastRecord?.batch || 0) + 1;
  }

  /**
   * Acquire migration lock
   */
  private async acquireLock(): Promise<void> {
    if (this.isLocked) {
      const lockAge = this.lockStartTime ? Date.now() - this.lockStartTime.getTime() : 0;
      
      if (lockAge > this.config.lockTimeout) {
        this.logger.warn('Force releasing expired migration lock');
        await this.releaseLock();
      } else {
        throw new Error('Migration is already in progress');
      }
    }

    this.isLocked = true;
    this.lockStartTime = new Date();
    
    this.logger.debug('Migration lock acquired');
  }

  /**
   * Release migration lock
   */
  private async releaseLock(): Promise<void> {
    this.isLocked = false;
    this.lockStartTime = undefined;
    
    this.logger.debug('Migration lock released');
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Migration timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  /**
   * Ensure migrations directory exists
   */
  private async ensureMigrationsDirectory(): Promise<void> {
    try {
      await fs.access(this.config.migrationsPath);
    } catch (error) {
      this.logger.info(`Creating migrations directory: ${this.config.migrationsPath}`);
      await fs.mkdir(this.config.migrationsPath, { recursive: true });
    }
  }

  /**
   * Generate version timestamp
   */
  private generateVersion(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}_${month}_${day}_${hours}${minutes}${seconds}`;
  }

  /**
   * Sanitize migration name
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Calculate file checksum
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Generate migration template
   */
  private generateMigrationTemplate(name: string, template: 'basic' | 'table' | 'index'): string {
    const className = name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');

    switch (template) {
      case 'table':
        return `import { Migration } from '../../../types/database';
import fs from 'fs/promises';
import { model, Schema } from 'mongoose';

/**
 * Migration: ${name}
 * Create new table/collection
 */
export default class ${className}Migration implements Migration {
  version = '${this.generateVersion()}';
  name = '${name}';

  async up(): Promise<void> {
    // Create new schema/collection
    const schema = new Schema({
      // Define your schema here
      name: {
        type: String,
        required: true,
        trim: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    });

    // Add indexes
    schema.index({ name: 1 });

    // Register model (if not already registered)
    if (!model.modelNames().includes('YourModel')) {
      model('YourModel', schema);
    }
  }

  async down(): Promise<void> {
    // Drop the collection
    const Model = model('YourModel');
    await Model.collection.drop();
  }
}
`;

      case 'index':
        return `import { Migration } from '../../../types/database';
import { model } from 'mongoose';

/**
 * Migration: ${name}
 * Add/remove database indexes
 */
export default class ${className}Migration implements Migration {
  version = '${this.generateVersion()}';
  name = '${name}';

  async up(): Promise<void> {
    // Add indexes
    const Model = model('YourModel');
    await Model.collection.createIndex({ fieldName: 1 });
    await Model.collection.createIndex({ field1: 1, field2: -1 });
  }

  async down(): Promise<void> {
    // Remove indexes
    const Model = model('YourModel');
    await Model.collection.dropIndex({ fieldName: 1 });
    await Model.collection.dropIndex({ field1: 1, field2: -1 });
  }
}
`;

      default: // basic
        return `import { Migration } from '../../../types/database';

/**
 * Migration: ${name}
 * Description: Add your migration description here
 */
export default class ${className}Migration implements Migration {
  version = '${this.generateVersion()}';
  name = '${name}';

  async up(): Promise<void> {
    // Implement your migration logic here
    console.log('Running migration: ${name}');
    
    // Example: Update existing documents
    // const Model = model('YourModel');
    // await Model.updateMany({}, { $set: { newField: 'defaultValue' } });
  }

  async down(): Promise<void> {
    // Implement rollback logic here
    console.log('Rolling back migration: ${name}');
    
    // Example: Remove the field added in up()
    // const Model = model('YourModel');
    // await Model.updateMany({}, { $unset: { newField: 1 } });
  }
}
`;
    }
  }
}

/**
 * Factory function to create migration manager
 */
export function createMigrationManager(config: MigrationManagerConfig): MigrationManager {
  return new MigrationManager(config);
}

/**
 * Get default migration manager instance
 */
export function getDefaultMigrationManager(): MigrationManager {
  const migrationsPath = path.join(process.cwd(), 'packages/core/src/database/migrations');
  
  return new MigrationManager({
    migrationsPath,
    dryRun: process.env.NODE_ENV === 'development',
  });
}

export default MigrationManager;