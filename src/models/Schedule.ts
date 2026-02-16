import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISchedule extends Document {
  userId: Types.ObjectId;
  intentId: Types.ObjectId;
  frequency: 'daily' | 'weekly' | 'monthly';
  amount: string;
  recipient: string;
  nextRun: Date;
  lastRun?: Date;
  isActive: boolean;
  signature: string;
  createdAt: Date;
}

const ScheduleSchema = new Schema<ISchedule>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  intentId: {
    type: Schema.Types.ObjectId,
    ref: 'Intent',
    required: true,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
  },
  amount: {
    type: String,
    required: true,
  },
  recipient: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  nextRun: {
    type: Date,
    required: true,
  },
  lastRun: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  signature: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
ScheduleSchema.index({ userId: 1 });
ScheduleSchema.index({ nextRun: 1, isActive: 1 });

export const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);