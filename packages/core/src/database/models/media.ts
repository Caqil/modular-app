import { Schema, model, Document, Types } from 'mongoose';

export interface IMedia extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  alt?: string;
  caption?: string;
  description?: string;
  uploadedBy: Types.ObjectId;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    maxlength: 200,
  },
  caption: {
    type: String,
    maxlength: 500,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    format: String,
  },
}, {
  timestamps: true,
});

// Indexes
MediaSchema.index({ uploadedBy: 1 });
MediaSchema.index({ mimeType: 1 });
MediaSchema.index({ createdAt: -1 });

export const Media = model<IMedia>('Media', MediaSchema);
