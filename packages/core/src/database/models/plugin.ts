import { Schema, model, Document, Types } from 'mongoose';
import { PluginCapability, PluginStatus } from '../../plugin/plugin-types';

export interface IPlugin extends Document {
  name: string;
  version: string;
  title: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  main: string;
  status: PluginStatus;
  capabilities: PluginCapability[];
  dependencies: Map<string, string>;
  peerDependencies: Map<string, string>;
  requirements: {
    cmsVersion: string;
    nodeVersion: string;
    phpVersion?: string;
  };
  settings: Map<string, any>;
  hooks: string[];
  filters: string[];
  routes: Array<{
    path: string;
    method: string;
    handler: string;
    middleware?: string[];
    capability?: string;
  }>;
  adminMenu?: {
    title: string;
    icon: string;
    position: number;
    capability?: string;
    submenu?: Array<{
      title: string;
      path: string;
      capability?: string;
    }>;
  };
  permissions: Array<{
    name: string;
    description: string;
    group?: string;
  }>;
  metadata: {
    path: string;
    fileSize: number;
    checksum: string;
    loadTime?: number;
    memoryUsage?: number;
  };
  installedAt: Date;
  activatedAt?: Date;
  lastUpdated?: Date;
  errorMessage?: string | undefined;
  errorCount: number;
  tags: string[];
  rating?: {
    average: number;
    count: number;
    reviews: Array<{
      userId: Types.ObjectId;
      rating: number;
      comment?: string;
      createdAt: Date;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PluginSchema = new Schema<IPlugin>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    validate: {
      validator: function(v: string) {
        return /^[a-z0-9-_]+$/.test(v);
      },
      message: 'Plugin name can only contain lowercase letters, numbers, hyphens, and underscores',
    },
    
  },
  version: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(v);
      },
      message: 'Invalid version format (use semantic versioning)',
    },
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  author: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  license: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  homepage: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid homepage URL format',
    },
  },
  repository: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid repository URL format',
    },
  },
  main: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  status: {
    type: String,
    enum: Object.values(PluginStatus),
    default: PluginStatus.INSTALLED,
  },
  capabilities: {
    type: [String],
    enum: Object.values(PluginCapability),
    default: [],
    validate: {
      validator: function(capabilities: PluginCapability[]) {
        return capabilities.length <= 20;
      },
      message: 'Too many capabilities (maximum 20)',
    },
  },
  dependencies: {
    type: Map,
    of: String,
    default: new Map(),
  },
  peerDependencies: {
    type: Map,
    of: String,
    default: new Map(),
  },
  requirements: {
    cmsVersion: {
      type: String,
      required: true,
      trim: true,
    },
    nodeVersion: {
      type: String,
      required: true,
      trim: true,
    },
    phpVersion: {
      type: String,
      trim: true,
    },
  },
  settings: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
  },
  hooks: {
    type: [String],
    default: [],
    validate: {
      validator: function(hooks: string[]) {
        return hooks.length <= 100;
      },
      message: 'Too many hooks (maximum 100)',
    },
  },
  filters: {
    type: [String],
    default: [],
    validate: {
      validator: function(filters: string[]) {
        return filters.length <= 100;
      },
      message: 'Too many filters (maximum 100)',
    },
  },
  routes: {
    type: [{
      path: {
        type: String,
        required: true,
        trim: true,
      },
      method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        uppercase: true,
      },
      handler: {
        type: String,
        required: true,
        trim: true,
      },
      middleware: {
        type: [String],
        default: [],
      },
      capability: {
        type: String,
        trim: true,
      },
    }],
    default: [],
    validate: {
      validator: function(routes: any[]) {
        return routes.length <= 50;
      },
      message: 'Too many routes (maximum 50)',
    },
  },
  adminMenu: {
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    position: {
      type: Number,
      min: 0,
      max: 1000,
    },
    capability: {
      type: String,
      trim: true,
    },
    submenu: {
      type: [{
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: 100,
        },
        path: {
          type: String,
          required: true,
          trim: true,
        },
        capability: {
          type: String,
          trim: true,
        },
      }],
      default: [],
    },
  },
  permissions: {
    type: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },
      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      group: {
        type: String,
        trim: true,
        maxlength: 50,
      },
    }],
    default: [],
  },
  metadata: {
    path: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    checksum: {
      type: String,
      required: true,
      trim: true,
    },
    loadTime: {
      type: Number,
      min: 0,
    },
    memoryUsage: {
      type: Number,
      min: 0,
    },
  },
  installedAt: {
    type: Date,
    required: true,
    default: Date.now,
    
  },
  activatedAt: {
    type: Date,
    
  },
  lastUpdated: {
    type: Date,
    
  },
  errorMessage: {
    type: String,
    trim: true,
  },
  errorCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags: string[]) {
        return tags.length <= 20;
      },
      message: 'Too many tags (maximum 20)',
    },
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    count: {
      type: Number,
      min: 0,
      default: 0,
    },
    reviews: {
      type: [{
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          trim: true,
          maxlength: 1000,
        },
        createdAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      }],
      default: [],
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
PluginSchema.index({ status: 1 });
PluginSchema.index({ capabilities: 1 });
PluginSchema.index({ author: 1 });
PluginSchema.index({ installedAt: -1 });
PluginSchema.index({ activatedAt: -1 });
PluginSchema.index({ tags: 1 });
PluginSchema.index({ 'rating.average': -1 });

// Text index for search
PluginSchema.index({
  title: 'text',
  description: 'text',
  author: 'text',
  tags: 'text',
});

// Compound indexes
PluginSchema.index({ status: 1, installedAt: -1 });
PluginSchema.index({ capabilities: 1, status: 1 });
PluginSchema.index({ author: 1, status: 1 });

// Virtual properties
PluginSchema.virtual('isActive').get(function() {
  return this.status === PluginStatus.ACTIVE;
});

PluginSchema.virtual('isInstalled').get(function() {
  return this.status !== PluginStatus.INACTIVE;
});

PluginSchema.virtual('hasErrors').get(function() {
  return this.status === PluginStatus.ERROR || this.errorCount > 0;
});

PluginSchema.virtual('fileSize').get(function() {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.metadata.fileSize;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
});

PluginSchema.virtual('daysSinceInstall').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.installedAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

PluginSchema.virtual('daysSinceActivation').get(function() {
  if (!this.activatedAt) return null;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.activatedAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance methods
PluginSchema.methods.activate = async function() {
  this.status = PluginStatus.ACTIVE;
  this.activatedAt = new Date();
  this.errorMessage = undefined;
  return this.save();
};

PluginSchema.methods.deactivate = async function() {
  this.status = PluginStatus.INSTALLED;
  this.activatedAt = undefined;
  return this.save();
};

PluginSchema.methods.markError = async function(errorMessage: string) {
  this.status = PluginStatus.ERROR;
  this.errorMessage = errorMessage;
  this.errorCount += 1;
  return this.save();
};

PluginSchema.methods.clearError = async function() {
  if (this.status === PluginStatus.ERROR) {
    this.status = PluginStatus.INSTALLED;
  }
  this.errorMessage = undefined;
  return this.save();
};

PluginSchema.methods.updateSettings = function(settings: Record<string, any>) {
  for (const [key, value] of Object.entries(settings)) {
    this.settings.set(key, value);
  }
  return this.save();
};

PluginSchema.methods.getSetting = function(key: string, defaultValue?: any) {
  return this.settings.get(key) ?? defaultValue;
};

PluginSchema.methods.addReview = function(userId: Types.ObjectId, rating: number, comment?: string) {
  // Remove existing review from same user
  this.rating.reviews = this.rating.reviews.filter(
    review => !review.userId.equals(userId)
  );
  
  // Add new review
  this.rating.reviews.push({
    userId,
    rating,
    comment,
    createdAt: new Date(),
  });
  
  // Recalculate average rating
  const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.rating.reviews.length;
  this.rating.count = this.rating.reviews.length;
  
  return this.save();
};

PluginSchema.methods.removeReview = function(userId: Types.ObjectId) {
  this.rating.reviews = this.rating.reviews.filter(
    review => !review.userId.equals(userId)
  );
  
  // Recalculate average rating
  if (this.rating.reviews.length > 0) {
    const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = totalRating / this.rating.reviews.length;
    this.rating.count = this.rating.reviews.length;
  } else {
    this.rating.average = 0;
    this.rating.count = 0;
  }
  
  return this.save();
};

PluginSchema.methods.hasCapability = function(capability: PluginCapability) {
  return this.capabilities.includes(capability);
};

PluginSchema.methods.addTag = function(tag: string) {
  const cleanTag = tag.toLowerCase().trim();
  if (!this.tags.includes(cleanTag) && this.tags.length < 20) {
    this.tags.push(cleanTag);
  }
  return this;
};

PluginSchema.methods.removeTag = function(tag: string) {
  this.tags = this.tags.filter(t => t !== tag.toLowerCase().trim());
  return this;
};

// Static methods
PluginSchema.statics.findActive = function() {
  return this.find({ status: PluginStatus.ACTIVE }).sort({ activatedAt: -1 });
};

PluginSchema.statics.findByCapability = function(capability: PluginCapability) {
  return this.find({ capabilities: capability });
};

PluginSchema.statics.findByAuthor = function(author: string) {
  return this.find({ author: new RegExp(author, 'i') }).sort({ installedAt: -1 });
};

PluginSchema.statics.findWithErrors = function() {
  return this.find({
    $or: [
      { status: PluginStatus.ERROR },
      { errorCount: { $gt: 0 } },
    ],
  }).sort({ lastUpdated: -1 });
};

PluginSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

PluginSchema.statics.getCapabilityStats = function() {
  return this.aggregate([
    { $unwind: '$capabilities' },
    {
      $group: {
        _id: '$capabilities',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

PluginSchema.statics.getTopRated = function(limit = 10) {
  return this.find({
    'rating.count': { $gte: 1 },
  })
  .sort({ 'rating.average': -1, 'rating.count': -1 })
  .limit(limit);
};

PluginSchema.statics.searchPlugins = function(query: string) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Pre-save middleware
PluginSchema.pre('save', function(next) {
  // Clean and validate tags
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags
      .map((tag: string) => tag.toLowerCase().trim())
      .filter((tag: string) => tag.length > 0 && tag.length <= 50)
      .slice(0, 20);
    
    // Remove duplicates
    this.tags = [...new Set(this.tags)];
  }

  // Set lastUpdated when status changes
  if (this.isModified('status')) {
    this.lastUpdated = new Date();
  }

  // Clear error message when status is not error
  if (this.status !== PluginStatus.ERROR) {
    this.errorMessage = undefined;
  }

  next();
});

// Post-save middleware
PluginSchema.post('save', function(doc) {
  // Emit events for plugin lifecycle changes
  if (doc.isModified('status')) {
    console.log(`Plugin ${doc.name} status changed to ${doc.status}`);
  }
});

// Pre-remove middleware
PluginSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // TODO: Clean up plugin files, remove hooks/filters, etc.
    console.log(`Removing plugin: ${this.name}`);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Plugin = model<IPlugin>('Plugin', PluginSchema);