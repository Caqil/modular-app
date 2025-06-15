import { Model, Document, Types, FilterQuery, UpdateQuery, QueryOptions as MongooseQueryOptions } from 'mongoose';
import type {
  BaseRepository,
  QueryOptions,
  PaginationOptions,
  PaginatedResult,
  SearchOptions,
  AggregationPipeline,
} from '../types/database';
import Logger from '../../utils/logger';
import { Sanitizer } from '../../utils/sanitizer';

export abstract class BaseRepositoryImpl<T extends Document> implements BaseRepository<T> {
  protected logger: Logger;

  constructor(public readonly model: Model<T>) {
    this.logger = new Logger(`${model.modelName}Repository`);
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      this.logger.debug('Creating document', { model: this.model.modelName });

      // Sanitize input data
      const sanitizedData = this.sanitizeInput(data);

      // Create document
      const document = new this.model(sanitizedData);
      const savedDocument = await document.save();

      this.logger.info('Document created successfully', {
        model: this.model.modelName,
        id: savedDocument._id,
      });

      return savedDocument;
    } catch (error) {
      this.logger.error('Error creating document:', error);
      throw this.handleError(error, 'CREATE_FAILED');
    }
  }

  /**
   * Find document by ID
   */
  async findById(id: string | Types.ObjectId, options: QueryOptions = {}): Promise<T | null> {
    try {
      if (!this.isValidObjectId(id)) {
        this.logger.warn('Invalid ObjectId provided', { id });
        return null;
      }

      this.logger.debug('Finding document by ID', {
        model: this.model.modelName,
        id: id.toString(),
      });

      let query = this.model.findById(id);

      // Apply query options
      query = this.applyQueryOptions(query, options);

      const document = await query.exec();

      if (document) {
        this.logger.debug('Document found', {
          model: this.model.modelName,
          id: document._id,
        });
      } else {
        this.logger.debug('Document not found', {
          model: this.model.modelName,
          id: id.toString(),
        });
      }

      return document;
    } catch (error) {
      this.logger.error('Error finding document by ID:', error);
      throw this.handleError(error, 'FIND_BY_ID_FAILED');
    }
  }

  /**
   * Find one document matching filter
   */
  async findOne(filter: Record<string, any>, options: QueryOptions = {}): Promise<T | null> {
    try {
      this.logger.debug('Finding one document', {
        model: this.model.modelName,
        filter: Object.keys(filter),
      });

      // Sanitize filter
      const sanitizedFilter = this.sanitizeFilter(filter);

      let query = this.model.findOne(sanitizedFilter);

      // Apply query options
      query = this.applyQueryOptions(query, options);

      const document = await query.exec();

      if (document) {
        this.logger.debug('Document found', {
          model: this.model.modelName,
          id: document._id,
        });
      }

      return document;
    } catch (error) {
      this.logger.error('Error finding one document:', error);
      throw this.handleError(error, 'FIND_ONE_FAILED');
    }
  }

  /**
   * Find multiple documents matching filter
   */
  async findMany(filter: Record<string, any>, options: QueryOptions = {}): Promise<T[]> {
    try {
      this.logger.debug('Finding multiple documents', {
        model: this.model.modelName,
        filter: Object.keys(filter),
      });

      // Sanitize filter
      const sanitizedFilter = this.sanitizeFilter(filter);

      let query = this.model.find(sanitizedFilter);

      // Apply query options
      query = this.applyQueryOptions(query, options);

      const documents = await query.exec();

      this.logger.debug('Documents found', {
        model: this.model.modelName,
        count: documents.length,
      });

      return documents;
    } catch (error) {
      this.logger.error('Error finding multiple documents:', error);
      throw this.handleError(error, 'FIND_MANY_FAILED');
    }
  }

  /**
   * Update document by ID
   */
  async updateById(id: string | Types.ObjectId, data: Partial<T>): Promise<T | null> {
    try {
      if (!this.isValidObjectId(id)) {
        this.logger.warn('Invalid ObjectId provided for update', { id });
        return null;
      }

      this.logger.debug('Updating document by ID', {
        model: this.model.modelName,
        id: id.toString(),
      });

      // Sanitize input data
      const sanitizedData = this.sanitizeInput(data);

      // Add updated timestamp
      const updateData = {
        ...sanitizedData,
        updatedAt: new Date(),
      };

      const document = await this.model.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).exec();

      if (document) {
        this.logger.info('Document updated successfully', {
          model: this.model.modelName,
          id: document._id,
        });
      } else {
        this.logger.warn('Document not found for update', {
          model: this.model.modelName,
          id: id.toString(),
        });
      }

      return document;
    } catch (error) {
      this.logger.error('Error updating document by ID:', error);
      throw this.handleError(error, 'UPDATE_BY_ID_FAILED');
    }
  }

  /**
   * Update one document matching filter
   */
  async updateOne(filter: Record<string, any>, data: Partial<T>): Promise<T | null> {
    try {
      this.logger.debug('Updating one document', {
        model: this.model.modelName,
        filter: Object.keys(filter),
      });

      // Sanitize inputs
      const sanitizedFilter = this.sanitizeFilter(filter);
      const sanitizedData = this.sanitizeInput(data);

      // Add updated timestamp
      const updateData = {
        ...sanitizedData,
        updatedAt: new Date(),
      };

      const document = await this.model.findOneAndUpdate(
        sanitizedFilter,
        updateData,
        { new: true, runValidators: true }
      ).exec();

      if (document) {
        this.logger.info('Document updated successfully', {
          model: this.model.modelName,
          id: document._id,
        });
      }

      return document;
    } catch (error) {
      this.logger.error('Error updating one document:', error);
      throw this.handleError(error, 'UPDATE_ONE_FAILED');
    }
  }

  /**
   * Update multiple documents matching filter
   */
  async updateMany(filter: Record<string, any>, data: Partial<T>): Promise<number> {
    try {
      this.logger.debug('Updating multiple documents', {
        model: this.model.modelName,
        filter: Object.keys(filter),
      });

      // Sanitize inputs
      const sanitizedFilter = this.sanitizeFilter(filter);
      const sanitizedData = this.sanitizeInput(data);

      // Add updated timestamp
      const updateData = {
        ...sanitizedData,
        updatedAt: new Date(),
      };

      const result = await this.model.updateMany(
        sanitizedFilter,
        updateData,
        { runValidators: true }
      ).exec();

      this.logger.info('Documents updated successfully', {
        model: this.model.modelName,
        modifiedCount: result.modifiedCount,
      });

      return result.modifiedCount || 0;
    } catch (error) {
      this.logger.error('Error updating multiple documents:', error);
      throw this.handleError(error, 'UPDATE_MANY_FAILED');
    }
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    try {
      if (!this.isValidObjectId(id)) {
        this.logger.warn('Invalid ObjectId provided for deletion', { id });
        return false;
      }

      this.logger.debug('Deleting document by ID', {
        model: this.model.modelName,
        id: id.toString(),
      });

      const result = await this.model.findByIdAndDelete(id).exec();

      if (result) {
        this.logger.info('Document deleted successfully', {
          model: this.model.modelName,
          id: result._id,
        });
        return true;
      } else {
        this.logger.warn('Document not found for deletion', {
          model: this.model.modelName,
          id: id.toString(),
        });
        return false;
      }
    } catch (error) {
      this.logger.error('Error deleting document by ID:', error);
      throw this.handleError(error, 'DELETE_BY_ID_FAILED');
    }
  }

  /**
   * Delete one document matching filter
   */
  async deleteOne(filter: Record<string, any>): Promise<boolean> {
    try {
      this.logger.debug('Deleting one document', {
        model: this.model.modelName,
        filter: Object.keys(filter),
      });

      // Sanitize filter
      const sanitizedFilter = this.sanitizeFilter(filter);

      const result = await this.model.findOneAndDelete(sanitizedFilter).exec();

      if (result) {
        this.logger.info('Document deleted successfully', {
          model: this.model.modelName,
          id: result._id,
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error deleting one document:', error);
      throw this.handleError(error, 'DELETE_ONE_FAILED');
    }
  }

  /**
   * Delete multiple documents matching filter
   */
  async deleteMany(filter: Record<string, any>): Promise<number> {
    try {
      this.logger.debug('Deleting multiple documents', {
        model: this.model.modelName,
        filter: Object.keys(filter),
      });

      // Sanitize filter
      const sanitizedFilter = this.sanitizeFilter(filter);

      const result = await this.model.deleteMany(sanitizedFilter).exec();

      this.logger.info('Documents deleted successfully', {
        model: this.model.modelName,
        deletedCount: result.deletedCount,
      });

      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error('Error deleting multiple documents:', error);
      throw this.handleError(error, 'DELETE_MANY_FAILED');
    }
  }

  /**
   * Count documents matching filter
   */
  async count(filter: Record<string, any> = {}): Promise<number> {
    try {
      this.logger.debug('Counting documents', {
        model: this.model.modelName,
        filter: Object.keys(filter),
      });

      // Sanitize filter
      const sanitizedFilter = this.sanitizeFilter(filter);

      const count = await this.model.countDocuments(sanitizedFilter).exec();

      this.logger.debug('Document count', {
        model: this.model.modelName,
        count,
      });

      return count;
    } catch (error) {
      this.logger.error('Error counting documents:', error);
      throw this.handleError(error, 'COUNT_FAILED');
    }
  }

  /**
   * Paginate documents
   */
  async paginate(filter: Record<string, any>, options: PaginationOptions): Promise<PaginatedResult<T>> {
    try {
      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;

      this.logger.debug('Paginating documents', {
        model: this.model.modelName,
        page,
        limit,
        filter: Object.keys(filter),
      });

      // Sanitize filter
      const sanitizedFilter = this.sanitizeFilter(filter);

      // Calculate skip
      const skip = (page - 1) * limit;

      // Execute queries in parallel
      const [data, total] = await Promise.all([
        this.model
          .find(sanitizedFilter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.model.countDocuments(sanitizedFilter).exec(),
      ]);

      // Calculate pagination info
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

      this.logger.debug('Pagination complete', {
        model: this.model.modelName,
        page,
        limit,
        total,
        pages,
        resultsCount: data.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Error paginating documents:', error);
      throw this.handleError(error, 'PAGINATE_FAILED');
    }
  }

  /**
   * Search documents
   */
  async search(options: SearchOptions, filter: Record<string, any> = {}): Promise<T[]> {
    try {
      const { query, fields = [], caseSensitive = false, wholeWord = false, regex = false } = options;

      this.logger.debug('Searching documents', {
        model: this.model.modelName,
        query,
        fields,
      });

      // Sanitize inputs
      const sanitizedFilter = this.sanitizeFilter(filter);
      const sanitizedQuery = Sanitizer.sanitizeSearchQuery(query);

      // Build search filter
      let searchFilter: any = { ...sanitizedFilter };

      if (fields.length > 0) {
        const searchConditions = fields.map(field => {
          if (regex) {
            const regexFlags = caseSensitive ? '' : 'i';
            const pattern = wholeWord ? `\\b${sanitizedQuery}\\b` : sanitizedQuery;
            return { [field]: { $regex: pattern, $options: regexFlags } };
          } else {
            return { [field]: { $regex: sanitizedQuery, $options: caseSensitive ? '' : 'i' } };
          }
        });

        searchFilter.$or = searchConditions;
      } else {
        // Use text search if no specific fields provided
        searchFilter.$text = { $search: sanitizedQuery };
      }

      const documents = await this.model.find(searchFilter).exec();

      this.logger.debug('Search complete', {
        model: this.model.modelName,
        query: sanitizedQuery,
        resultsCount: documents.length,
      });

      return documents;
    } catch (error) {
      this.logger.error('Error searching documents:', error);
      throw this.handleError(error, 'SEARCH_FAILED');
    }
  }

  /**
   * Aggregate documents
   */
  async aggregate(pipeline: AggregationPipeline[]): Promise<any[]> {
    try {
      this.logger.debug('Aggregating documents', {
        model: this.model.modelName,
        pipelineStages: pipeline.length,
      });

      const result = await this.model.aggregate(pipeline).exec();

      this.logger.debug('Aggregation complete', {
        model: this.model.modelName,
        resultsCount: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Error aggregating documents:', error);
      throw this.handleError(error, 'AGGREGATE_FAILED');
    }
  }

  /**
   * Check if document exists
   */
  async exists(filter: Record<string, any>): Promise<boolean> {
    try {
      const sanitizedFilter = this.sanitizeFilter(filter);
      const document = await this.model.exists(sanitizedFilter).exec();
      return !!document;
    } catch (error) {
      this.logger.error('Error checking document existence:', error);
      throw this.handleError(error, 'EXISTS_CHECK_FAILED');
    }
  }

  /**
   * Bulk insert documents
   */
  async bulkInsert(documents: Partial<T>[]): Promise<T[]> {
    try {
      this.logger.debug('Bulk inserting documents', {
        model: this.model.modelName,
        count: documents.length,
      });

      // Sanitize all documents
      const sanitizedDocuments = documents.map(doc => this.sanitizeInput(doc));

      const result = await this.model.insertMany(sanitizedDocuments, {
        ordered: false,
        rawResult: false,
      });

      this.logger.info('Bulk insert complete', {
        model: this.model.modelName,
        insertedCount: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Error bulk inserting documents:', error);
      throw this.handleError(error, 'BULK_INSERT_FAILED');
    }
  }

  /**
   * Get distinct values for a field
   */
  async distinct(field: string, filter: Record<string, any> = {}): Promise<any[]> {
    try {
      const sanitizedFilter = this.sanitizeFilter(filter);
      const values = await this.model.distinct(field, sanitizedFilter).exec();
      
      this.logger.debug('Distinct values retrieved', {
        model: this.model.modelName,
        field,
        valueCount: values.length,
      });

      return values;
    } catch (error) {
      this.logger.error('Error getting distinct values:', error);
      throw this.handleError(error, 'DISTINCT_FAILED');
    }
  }

  /**
   * Apply query options to a mongoose query
   */
  protected applyQueryOptions(query: any, options: QueryOptions): any {
    if (options.populate) {
      if (typeof options.populate === 'string') {
        query = query.populate(options.populate);
      } else if (Array.isArray(options.populate)) {
        options.populate.forEach(pop => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
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
   * Sanitize input data
   */
  protected sanitizeInput(data: any): any {
    return Sanitizer.sanitizeDbInput(data);
  }

  /**
   * Sanitize filter object
   */
  protected sanitizeFilter(filter: Record<string, any>): Record<string, any> {
    return Sanitizer.sanitizeDbInput(filter);
  }

  /**
   * Validate ObjectId
   */
  protected isValidObjectId(id: any): boolean {
    return Types.ObjectId.isValid(id);
  }

  /**
   * Handle repository errors
   */
  protected handleError(error: any, operation: string): Error {
    if (error.name === 'ValidationError') {
      return new Error(`Validation failed during ${operation}: ${error.message}`);
    }
    if (error.name === 'CastError') {
      return new Error(`Invalid data type during ${operation}: ${error.message}`);
    }
    if (error.code === 11000) {
      return new Error(`Duplicate key error during ${operation}: ${error.message}`);
    }

    return new Error(`${operation}: ${error.message}`);
  }

  /**
   * Get model name
   */
  public getModelName(): string {
    return this.model.modelName;
  }

  /**
   * Get collection name
   */
  public getCollectionName(): string {
    return this.model.collection.name;
  }
}