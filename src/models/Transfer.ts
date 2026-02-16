import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransfer extends Document {
  intentId: Types.ObjectId;
  userId: Types.ObjectId;
  agentId: number;
  txHash: string;
  recipient: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  reputationRecorded: boolean;
  errorMessage?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

const TransferSchema = new Schema<ITransfer>({
  intentId: {
    type: Schema.Types.ObjectId,
    ref: 'Intent',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  agentId: {
    type: Number,
    required: true,
  },
  txHash: {
    type: String,
    required: true,
    unique: true,
  },
  recipient: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  amount: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  },
  blockNumber: Number,
  gasUsed: String,
  reputationRecorded: {
    type: Boolean,
    default: false,
  },
  errorMessage: String,
  confirmedAt: Date,
}, {
  timestamps: true,
});

// Indexes
TransferSchema.index({ userId: 1, createdAt: -1 });
TransferSchema.index({ status: 1 });

export const Transfer = mongoose.model<ITransfer>('Transfer', TransferSchema);