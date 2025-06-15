import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'editor' | 'author' | 'subscriber';
  avatar?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'suspended';
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'author', 'subscriber'],
    default: 'subscriber',
  },
  avatar: {
    type: String,
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

export const User = model<IUser>('User', UserSchema);