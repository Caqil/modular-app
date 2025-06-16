import type { Connection, Model, Document, QueryOptions as MongooseQueryOptions, PipelineStage } from 'mongoose';
import type { Types } from 'mongoose';
import type { PopulateOptions } from 'mongoose';
export interface DatabaseConfig {
  uri: string;
  name: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    bufferCommands?: boolean;
    bufferMaxEntries?: number;
  };
}

export interface DatabaseConnection {
  connection: Connection | null;
  isConnected: boolean;
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  getConnection(): Connection;
  healthCheck(): Promise<boolean>;
}

export interface ModelDefinition<T = any> {
  name: string;
  schema: any;
  options?: {
    collection?: string;
    timestamps?: boolean;
    versionKey?: boolean;
  };
  model?: Model<T>;
}



export interface QueryOptions extends MongooseQueryOptions {
  populate?: string | string[] | PopulateOptions | PopulateOptions[];
  lean?: boolean;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  select?: string | Record<string, 1 | 0>;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchOptions {
  query: string;
  fields: string[];
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

export interface AggregationPipeline {
  $match?: Record<string, any>;
  $group?: Record<string, any>;
  $project?: Record<string, any>;
  $sort?: Record<string, 1 | -1>;
  $limit?: number;
  $skip?: number;
  $lookup?: Record<string, any>;
  $unwind?: string | Record<string, any>;
}

export interface DatabaseStats {
  collections: number;
  documents: number;
  indexes: number;
  dataSize: number;
  storageSize: number;
  avgObjSize: number;
}

export interface IndexDefinition {
  fields: Record<string, 1 | -1 | 'text' | '2dsphere'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    name?: string;
    expireAfterSeconds?: number;
  };
}

export interface TransactionOptions {
  readConcern?: 'local' | 'available' | 'majority' | 'linearizable' | 'snapshot';
  writeConcern?: {
    w?: number | 'majority';
    j?: boolean;
    wtimeout?: number;
  };
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
}

export interface BaseRepository<T extends Document> {
  model: Model<T>;
  create(data: Partial<T>): Promise<T>;
  findById(id: string | Types.ObjectId, options?: QueryOptions): Promise<T | null>;
  findOne(filter: Record<string, any>, options?: QueryOptions): Promise<T | null>;
  findMany(filter: Record<string, any>, options?: QueryOptions): Promise<T[]>;
  updateById(id: string | Types.ObjectId, data: Partial<T>): Promise<T | null>;
  updateOne(filter: Record<string, any>, data: Partial<T>): Promise<T | null>;
  updateMany(filter: Record<string, any>, data: Partial<T>): Promise<number>;
  deleteById(id: string | Types.ObjectId): Promise<boolean>;
  deleteOne(filter: Record<string, any>): Promise<boolean>;
  deleteMany(filter: Record<string, any>): Promise<number>;
  count(filter?: Record<string, any>): Promise<number>;
  paginate(filter: Record<string, any>, options: PaginationOptions): Promise<PaginatedResult<T>>;
  search(options: SearchOptions, filter?: Record<string, any>): Promise<T[]>;
  aggregate(pipeline: PipelineStage[]): Promise<any[]>; // Changed from AggregationPipeline[] to PipelineStage[]
}

export interface Migration {
  version: string;
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

export interface MigrationRecord {
  version: string;
  name: string;
  executedAt: Date;
}
