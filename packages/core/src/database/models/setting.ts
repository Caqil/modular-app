import { Schema, model, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  group: string;
  public: boolean;
  editable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'json'],
    default: 'string',
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  group: {
    type: String,
    default: 'general',
    trim: true,
  },
  public: {
    type: Boolean,
    default: false,
  },
  editable: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
SettingSchema.index({ group: 1 });
SettingSchema.index({ public: 1 });

export const Setting = model<ISetting>('Setting', SettingSchema);