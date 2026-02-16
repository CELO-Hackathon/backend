import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IIntent extends Document {
  userId: Types.ObjectId;
  rawInput: string;
  parsedIntent: {
    action: 'single_transfer' | 'recurring_transfer';
    amount: string;
    currency: string;
    recipient: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
  };
  status: 'pending' | 'executed' | 'scheduled' | 'failed';
  executionPlan: {
    route: string;
    gasEstimate: string;
    requiresApproval: boolean;
  };
  errorMessage?: string;
  createdAt: Date;
  executedAt?: Date;
}

const IntentSchema = new Schema<IIntent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rawInput: {
    type: String,
    required: true,
  },
  parsedIntent: {
    action: {
      type: String,
      enum: ['single_transfer', 'recurring_transfer'],
      required: true,
    },
    amount: { type: String, required: true },
    currency: { type: String, required: true },
    recipient: { type: String, required: true },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
  },
  status: {
    type: String,
    enum: ['pending', 'executed', 'scheduled', 'failed'],
    default: 'pending',
  },
  executionPlan: {
    route: { type: String, required: true },
    gasEstimate: { type: String, required: true },
    requiresApproval: { type: Boolean, required: true },
  },
  errorMessage: String,
  executedAt: Date,
}, {
  timestamps: true,
});

// Indexes
IntentSchema.index({ userId: 1, createdAt: -1 });
IntentSchema.index({ status: 1 });

export const Intent = mongoose.model<IIntent>('Intent', IntentSchema);