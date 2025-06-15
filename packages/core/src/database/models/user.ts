import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: 'super_admin' | 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'banned';
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  birthDate?: Date;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  providers: Array<{
    provider: string;
    providerId: string;
    profile?: any;
    connectedAt: Date;
  }>;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      comments: boolean;
      mentions: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private';
      showEmail: boolean;
      allowMessages: boolean;
    };
  };
  stats: {
    loginCount: number;
    postCount: number;
    commentCount: number;
    lastLoginAt?: Date;
    lastActivityAt?: Date;
  };
  security: {
    passwordChangedAt?: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
  };
  metadata: {
    source: string;
    referrer?: string;
    invitedBy?: Types.ObjectId;
    notes?: string;
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 100,
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
    minlength: 8,
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
  displayName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'editor', 'author', 'contributor', 'subscriber'],
    default: 'subscriber',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending', 'banned'],
    default: 'pending',
  },
  avatar: {
    type: String,
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  website: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  birthDate: {
    type: Date,
  },
  phone: {
    type: String,
    trim: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  providers: {
    type: [{
      provider: {
        type: String,
        required: true,
      },
      providerId: {
        type: String,
        required: true,
      },
      profile: {
        type: Schema.Types.Mixed,
      },
      connectedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    }],
    default: [],
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
    },
    language: {
      type: String,
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public',
      },
      showEmail: { type: Boolean, default: false },
      allowMessages: { type: Boolean, default: true },
    },
  },
  stats: {
    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    postCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLoginAt: {
      type: Date,
    },
    lastActivityAt: {
      type: Date,
    },
  },
  security: {
    passwordChangedAt: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
  },
  metadata: {
    source: {
      type: String,
      default: 'registration',
    },
    referrer: {
      type: String,
      trim: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  lastLogin: {
    type: Date,
  },
  deletedAt: {
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
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ deletedAt: 1 });

export const User = model<IUser>('User', UserSchema);