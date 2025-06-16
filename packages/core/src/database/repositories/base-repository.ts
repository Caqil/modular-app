import { Model, Document, Types, FilterQuery, UpdateQuery } from 'mongoose';
import type {
  BaseRepository as IBaseRepository,
  QueryOptions as CustomQueryOptions,
  PaginationOptions,
  SearchOptions,
  AggregationPipeline,
} from '../../types/database';
import Logger from '../../utils/logger';
import { EventManager } from '../../events/event-manager';
import { PaginatedResult, QueryOptions } from '../../types/database';
import { DateUtils } from '../../utils/date-utils';
export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {
  protected logger: Logger;
  protected events = EventManager.getInstance();

  constructor(
    public model: Model<T>,
    protected modelName: string
  ) {
    this.logger = new Logger(`${modelName}Repository`);
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      this.logger.debug(`Creating new ${this.modelName}`, {
        keys: Object.keys(data),
      });

      const document = new this.model(data);
      const saved = await document.save();

      this.logger.info(`${this.modelName} created successfully`, {
        id: saved._id,
      });

      // Emit creation event
      await this.events.emit('database:document_created', {
        model: this.modelName,
        id: saved._id,
        data: this.sanitizeForLogging(saved.toObject()),
      });

      return saved;
    } catch (error) {
      this.logger.error(`Error creating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find document by ID
   */
  async findById(
    id: string | Types.ObjectId,
    options: CustomQueryOptions = {}
  ): Promise<T | null> {
    try {
      const objectId = this.ensureObjectId(id);
      
      this.logger.debug(`Finding ${this.modelName} by ID`, { id: objectId });

      let query = this.model.findById(objectId);

      // Apply query options
      query = this.applyQueryOptions(query, options);

      const document = await query.exec();

      if (document) {
        this.logger.debug(`${this.modelName} found`, { id: objectId });
      } else {
        this.logger.debug(`${this.modelName} not found`, { id: objectId });
      }

      return document;
    } catch (error) {
      this.logger.error(`Error finding ${this.modelName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find one document by filter
   */
  async findOne(
    filter: FilterQuery<T>,
    options: CustomQueryOptions = {}
  ): Promise<T | null> {
    try {
      this.logger.debug(`Finding one ${this.modelName}`, {
        filter: this.sanitizeFilter(filter),
      });

      let query = this.model.findOne(filter);

      // Apply query options
      query = this.applyQueryOptions(query, options);

      const document = await query.exec();

      if (document) {
        this.logger.debug(`${this.modelName} found`, { id: document._id });
      }

      return document;
    } catch (error) {
      this.logger.error(`Error finding one ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find multiple documents
   */
  async findMany(
    filter: FilterQuery<T> = {},
    options: CustomQueryOptions = {}
  ): Promise<T[]> {
    try {
      this.logger.debug(`Finding multiple ${this.modelName}`, {
        filter: this.sanitizeFilter(filter),
        options: this.sanitizeOptions(options),
      });

      let query = this.model.find(filter);

      // Apply query options
      query = this.applyQueryOptions(query, options);

      const documents = await query.exec();

      this.logger.debug(`Found ${documents.length} ${this.modelName} documents`);

      return documents;
    } catch (error) {
      this.logger.error(`Error finding multiple ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update document by ID
   */
  async updateById(
    id: string | Types.ObjectId,
    data: UpdateQuery<T>
  ): Promise<T | null> {
    try {
      const objectId = this.ensureObjectId(id);
      
      this.logger.debug(`Updating ${this.modelName} by ID`, {
        id: objectId,
        updateKeys: Object.keys(data as any),
      });

      const document = await this.model.findByIdAndUpdate(
        objectId,
        data,
        { new: true, runValidators: true }
      ).exec();

      if (document) {
        this.logger.info(`${this.modelName} updated successfully`, {
          id: objectId,
        });

        // Emit update event
        await this.events.emit('database:document_updated', {
          model: this.modelName,
          id: objectId,
          data: this.sanitizeForLogging(document.toObject()),
        });
      } else {
        this.logger.warn(`${this.modelName} not found for update`, { id: objectId });
      }

      return document;
    } catch (error) {
      this.logger.error(`Error updating ${this.modelName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Update one document by filter
   */
  async updateOne(
    filter: FilterQuery<T>,
    data: UpdateQuery<T>
  ): Promise<T | null> {
    try {
      this.logger.debug(`Updating one ${this.modelName}`, {
        filter: this.sanitizeFilter(filter),
        updateKeys: Object.keys(data as any),
      });

      const document = await this.model.findOneAndUpdate(
        filter,
        data,
        { new: true, runValidators: true }
      ).exec();

      if (document) {
        this.logger.info(`${this.modelName} updated successfully`, {
          id: document._id,
        });

        // Emit update event
        await this.events.emit('database:document_updated', {
          model: this.modelName,
          id: document._id,
          data: this.sanitizeForLogging(document.toObject()),
        });
      }

      return document;
    } catch (error) {
      this.logger.error(`Error updating one ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: FilterQuery<T>,
    data: UpdateQuery<T>
  ): Promise<number> {
    try {
      this.logger.debug(`Updating multiple ${this.modelName}`, {
        filter: this.sanitizeFilter(filter),
        updateKeys: Object.keys(data as any),
      });

      const result = await this.model.updateMany(filter, data, {
        runValidators: true,
      }).exec();

      const modifiedCount = result.modifiedCount || 0;

      this.logger.info(`Updated ${modifiedCount} ${this.modelName} documents`);

      // Emit bulk update event
      await this.events.emit('database:documents_updated', {
        model: this.modelName,
        count: modifiedCount,
        filter: this.sanitizeFilter(filter),
      });

      return modifiedCount;
    } catch (error) {
      this.logger.error(`Error updating multiple ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    try {
      const objectId = this.ensureObjectId(id);
      
      this.logger.debug(`Deleting ${this.modelName} by ID`, { id: objectId });

      const result = await this.model.findByIdAndDelete(objectId).exec();

      if (result) {
        this.logger.info(`${this.modelName} deleted successfully`, {
          id: objectId,
        });

        // Emit deletion event
        await this.events.emit('database:document_deleted', {
          model: this.modelName,
          id: objectId,
        });

        return true;
      } else {
        this.logger.warn(`${this.modelName} not found for deletion`, { id: objectId });
        return false;
      }
    } catch (error) {
      this.logger.error(`Error deleting ${this.modelName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Delete one document by filter
   */
  async deleteOne(filter: FilterQuery<T>): Promise<boolean> {
    try {
      this.logger.debug(`Deleting one ${this.modelName}`, {
        filter: this.sanitizeFilter(filter),
      });

      const result = await this.model.findOneAndDelete(filter).exec();

      if (result) {
        this.logger.info(`${this.modelName} deleted successfully`, {
          id: result._id,
        });

        // Emit deletion event
        await this.events.emit('database:document_deleted', {
          model: this.modelName,
          id: result._id,
        });

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error deleting one ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    try {
      this.logger.debug(`Deleting multiple ${this.modelName}`, {
        filter: this.sanitizeFilter(filter),
      });

      const result = await this.model.deleteMany(filter).exec();
      const deletedCount = result.deletedCount || 0;

      this.logger.info(`Deleted ${deletedCount} ${this.modelName} documents`);

      // Emit bulk deletion event
      await this.events.emit('database:documents_deleted', {
        model: this.modelName,
        count: deletedCount,
        filter: this.sanitizeFilter(filter),
      });

      return deletedCount;
    } catch (error) {
      this.logger.error(`Error deleting multiple ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Count documents
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      this.logger.debug(`Counting ${this.modelName} documents`, {
        filter: this.sanitizeFilter(filter),
      });

      const count = await this.model.countDocuments(filter).exec();

      this.logger.debug(`Found ${count} ${this.modelName} documents`);

      return count;
    } catch (error) {
      this.logger.error(`Error counting ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Paginate documents
   */
  async paginate(
    filter: FilterQuery<T>,
    options: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
      const skip = (page - 1) * limit;

      this.logger.debug(`Paginating ${this.modelName}`, {
        filter: this.sanitizeFilter(filter),
        page,
        limit,
        skip,
      });

      // Get total count
      const total = await this.count(filter);

      // Get paginated data
      const data = await this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec();

      const pages = Math.ceil(total / limit);
      const hasNext = page < pages;
      const hasPrev = page > 1;

      const result: PaginatedResult<T> = {
        data,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext,
          hasPrev,
        },
      };

      this.logger.debug(`Paginated ${this.modelName} results`, {
        total,
        pages,
        currentPage: page,
        hasNext,
        hasPrev,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error paginating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async search(
    options: SearchOptions,
    filter: FilterQuery<T> = {}
  ): Promise<T[]> {
    try {
      const { query, fields, caseSensitive = false, regex = false } = options;

      this.logger.debug(`Searching ${this.modelName}`, {
        query,
        fields,
        caseSensitive,
        regex,
      });

      let searchFilter: FilterQuery<T>;

      if (regex) {
        // Regex search
        const regexPattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
        searchFilter = {
          $or: fields.map(field => ({ [field]: regexPattern })),
        } as FilterQuery<T>;
      } else {
        // Text search
        searchFilter = {
          $text: { $search: query, $caseSensitive: caseSensitive },
        } as FilterQuery<T>;
      }

      // Combine with additional filters
      const combinedFilter = {
        ...filter,
        ...searchFilter,
      } as FilterQuery<T>;

      const documents = await this.model.find(combinedFilter).exec();

      this.logger.debug(`Found ${documents.length} ${this.modelName} documents from search`);

      return documents;
    } catch (error) {
      this.logger.error(`Error searching ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate documents
   */
  async aggregate(pipeline: AggregationPipeline[]): Promise<any[]> {
    try {
      this.logger.debug(`Aggregating ${this.modelName}`, {
        pipelineStages: pipeline.length,
      });

      const results = await this.model.aggregate(pipeline).exec();

      this.logger.debug(`Aggregation returned ${results.length} results`);

      return results;
    } catch (error) {
      this.logger.error(`Error aggregating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Check if document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const document = await this.model.exists(filter).exec();
      return !!document;
    } catch (error) {
      this.logger.error(`Error checking ${this.modelName} existence:`, error);
      throw error;
    }
  }

  /**
   * Get distinct values for a field
   */
  async distinct(field: string, filter: FilterQuery<T> = {}): Promise<any[]> {
    try {
      this.logger.debug(`Getting distinct ${field} values from ${this.modelName}`);

      const values = await this.model.distinct(field, filter).exec();

      this.logger.debug(`Found ${values.length} distinct values for ${field}`);

      return values;
    } catch (error) {
      this.logger.error(`Error getting distinct values for ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Bulk write operations
   */
  async bulkWrite(operations: any[]): Promise<any> {
    try {
      this.logger.debug(`Executing bulk write for ${this.modelName}`, {
        operationCount: operations.length,
      });

      const result = await this.model.bulkWrite(operations);

      this.logger.info(`Bulk write completed for ${this.modelName}`, {
        insertedCount: result.insertedCount,
        modifiedCount: result.modifiedCount,
        deletedCount: result.deletedCount,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error in bulk write for ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Apply query options to a query
   */
  protected applyQueryOptions(query: any, options: CustomQueryOptions): any {
    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.skip) {
      query = query.skip(options.skip);
    }

    if (options.lean) {
      query = query.lean();
    }

    return query;
  }

  /**
   * Ensure value is ObjectId
   */
  protected ensureObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (typeof id === 'string') {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId format');
      }
      return new Types.ObjectId(id);
    }
    return id;
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   */
  protected sanitizeForLogging(data: any): any {
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize filter for logging
   */
  protected sanitizeFilter(filter: any): any {
    return this.sanitizeForLogging(filter);
  }

  /**
   * Sanitize options for logging
   */
  protected sanitizeOptions(options: any): any {
    return {
      ...options,
      populate: options.populate ? '[POPULATED]' : undefined,
    };
  }

  /**
   * Get repository statistics
   */
  async getStats(): Promise<{
    total: number;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  }> {
    try {
      const now = new Date();
      const startOfDay = DateUtils.startOfDay(now);
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [total, createdToday, createdThisWeek, createdThisMonth] = await Promise.all([
        this.count(),
        this.count({ createdAt: { $gte: startOfDay } } as FilterQuery<T>),
        this.count({ createdAt: { $gte: startOfWeek } } as FilterQuery<T>),
        this.count({ createdAt: { $gte: startOfMonth } } as FilterQuery<T>),
      ]);

      return {
        total,
        createdToday,
        createdThisWeek,
        createdThisMonth,
      };
    } catch (error) {
      this.logger.error(`Error getting ${this.modelName} stats:`, error);
      throw error;
    }
  }
}