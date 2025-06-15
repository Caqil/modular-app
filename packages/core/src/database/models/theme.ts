import { Schema, model, Document } from 'mongoose';

export interface ITheme extends Document {
  name: string;
  version: string;
  title: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  screenshot?: string;
  status: 'installed' | 'active' | 'inactive' | 'error';
  settings: Map<string, any>;
  metadata: {
    path: string;
    fileSize: number;
    checksum: string;
  };
  installedAt: Date;
  activatedAt?: Date;
  lastUpdated?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ThemeSchema = new Schema<ITheme>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
  },
  version: {
    type: String,
    required: true,
    trim: true,
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
  },
  repository: {
    type: String,
    trim: true,
  },
  screenshot: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['installed', 'active', 'inactive', 'error'],
    default: 'installed',
  },
  settings: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
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
    maxlength: 1000,
  },
}, {
  timestamps: true,
});

// Indexes
ThemeSchema.index({ name: 1 });
ThemeSchema.index({ status: 1 });
ThemeSchema.index({ author: 1 });

export const Theme = model<ITheme>('Theme', ThemeSchema);