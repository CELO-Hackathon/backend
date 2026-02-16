import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  address: string;
  agentAuthorized: boolean;
  dailyLimit: string;
  preferences: {
    defaultRecipient?: string;
    preferredCurrency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  agentAuthorized: {
    type: Boolean,
    default: false,
  },
  dailyLimit: {
    type: String,
    default: '100000000000000000000', // 100 cUSD
  },
  preferences: {
    defaultRecipient: {
      type: String,
      match: /^0x[a-fA-F0-9]{40}$/,
    },
    preferredCurrency: {
      type: String,
      enum: ['USD', 'cUSD'],
      default: 'cUSD',
    },
  },
}, {
  timestamps: true,
});

export const User = mongoose.model<IUser>('User', UserSchema);