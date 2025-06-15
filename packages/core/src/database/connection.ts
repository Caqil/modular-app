import mongoose, { Connection } from 'mongoose';
import { Logger } from '../utils/logger';
import { EventManager } from '../events/event-manager';
import type { DatabaseConfig, DatabaseConnection as IDatabaseConnection } from '../types/database';

export class DatabaseConnection implements IDatabaseConnection {
  private static instance: DatabaseConnection;
  private logger = new Logger('DatabaseConnection');
  private events = EventManager.getInstance();
  
  public connection: Connection | null = null;
  public isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Connect to MongoDB database
   */
  public async connect(config: DatabaseConfig): Promise<void> {
    try {
      this.logger.info('Connecting to MongoDB...', {
        uri: this.sanitizeUri(config.uri),
        database: config.name,
      });

      // Default connection options
      const defaultOptions = {
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
        ...config.options,
      };

      // Connect to MongoDB
      await mongoose.connect(config.uri, defaultOptions);
      
      this.connection = mongoose.connection;
      this.isConnected = true;

      // Set up connection event handlers
      this.setupEventHandlers();

      this.logger.info('Successfully connected to MongoDB', {
        database: config.name,
        host: this.connection.host,
        port: this.connection.port,
      });

      // Emit connection event
      await this.events.emit('database:connected', {
        database: config.name,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Failed to connect to MongoDB:', error);
      this.isConnected = false;
      
      // Emit connection error event
      await this.events.emit('database:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.connection && this.isConnected) {
        this.logger.info('Disconnecting from MongoDB...');
        
        await mongoose.disconnect();
        
        this.connection = null;
        this.isConnected = false;

        this.logger.info('Successfully disconnected from MongoDB');

        // Emit disconnection event
        await this.events.emit('database:disconnected', {
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get the current connection
   */
  public getConnection(): Connection {
    if (!this.connection) {
      throw new Error('Database not connected');
    }
    return this.connection;
  }

  /**
   * Health check for database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.connection || !this.isConnected) {
        return false;
      }

      // Check connection state
      if (this.connection.readyState !== 1) {
        return false;
      }

      // Check if db instance exists
      if (!this.connection.db) {
        return false;
      }

      // Ping the database
      await this.connection.db.admin().ping();
      
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<{
    isConnected: boolean;
    readyState: number;
    host?: string;
    port?: number;
    database?: string;
    collections?: number;
    indexes?: number;
  }> {
    if (!this.connection) {
      return {
        isConnected: false,
        readyState: 0,
      };
    }

    try {
      if (!this.connection.db) {
        throw new Error('Database instance not found');
      }
      const stats = await this.connection.db.stats();
      const collections = await this.connection.db.listCollections().toArray();

      return {
        isConnected: this.isConnected,
        readyState: this.connection.readyState,
        host: this.connection.host,
        port: this.connection.port,
        database: this.connection.name,
        collections: collections.length,
        indexes: stats.indexes || 0,
      };
    } catch (error) {
      this.logger.error('Error getting database stats:', error);
      return {
        isConnected: this.isConnected,
        readyState: this.connection.readyState,
        host: this.connection.host,
        port: this.connection.port,
        database: this.connection.name,
      };
    }
  }

  /**
   * Execute database transaction
   */
  public async transaction<T>(
    operations: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const result = await operations(session);
      
      await session.commitTransaction();
      
      this.logger.debug('Database transaction completed successfully');
      
      return result;
    } catch (error) {
      await session.abortTransaction();
      
      this.logger.error('Database transaction failed:', error);
      
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Create database indexes
   */
  public async createIndexes(): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      this.logger.info('Creating database indexes...');

      // Get all registered models
      const models = mongoose.models;
      
      for (const [modelName, model] of Object.entries(models)) {
        try {
          await model.createIndexes();
          this.logger.debug(`Indexes created for model: ${modelName}`);
        } catch (error) {
          this.logger.error(`Failed to create indexes for model ${modelName}:`, error);
        }
      }

      this.logger.info('Database indexes creation completed');
    } catch (error) {
      this.logger.error('Error creating database indexes:', error);
      throw error;
    }
  }

  /**
   * Drop database (use with caution)
   */
  public async dropDatabase(): Promise<void> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      this.logger.warn('Dropping database...');
      
      if (!this.connection.db) {
        throw new Error('Database instance not found');
      }
      
      await this.connection.db.dropDatabase();
      
      this.logger.warn('Database dropped successfully');
      
      // Emit database drop event
      await this.events.emit('database:dropped', {
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error dropping database:', error);
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on('connected', () => {
      this.logger.info('Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    this.connection.on('error', (error) => {
      this.logger.error('Mongoose connection error:', error);
      this.isConnected = false;
      
      // Emit error event
      this.events.emit('database:error', {
        error: error.message,
        timestamp: new Date(),
      });
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;
      
      // Emit disconnection event
      this.events.emit('database:disconnected', {
        timestamp: new Date(),
      });
    });

    this.connection.on('reconnected', () => {
      this.logger.info('Mongoose reconnected to MongoDB');
      this.isConnected = true;
      
      // Emit reconnection event
      this.events.emit('database:reconnected', {
        timestamp: new Date(),
      });
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await this.disconnect();
        this.logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });
  }

  /**
   * Sanitize URI for logging (remove credentials)
   */
  private sanitizeUri(uri: string): string {
    try {
      const url = new URL(uri);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return 'mongodb://[hidden]';
    }
  }

  /**
   * Check if database exists
   */
  public async databaseExists(name: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      if (!this.connection.db) {
        throw new Error('Database instance not found');
      }
      const admin = this.connection.db.admin();
      const databases = await admin.listDatabases();
      
      return databases.databases.some(db => db.name === name);
    } catch (error) {
      this.logger.error('Error checking database existence:', error);
      return false;
    }
  }

  /**
   * Get connection info
   */
  public getConnectionInfo(): {
    isConnected: boolean;
    readyState: number;
    host?: string;
    port?: number;
    database?: string;
  } {
    if (!this.connection) {
      return {
        isConnected: false,
        readyState: 0,
      };
    }

    return {
      isConnected: this.isConnected,
      readyState: this.connection.readyState,
      host: this.connection.host,
      port: this.connection.port,
      database: this.connection.name,
    };
  }
}