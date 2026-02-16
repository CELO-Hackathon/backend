import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthNonce extends Document {
  address: string;
  nonce: string;
  expiresAt: Date;
  createdAt: Date;
}

const AuthNonceSchema = new Schema<IAuthNonce>({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  nonce: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Auto-delete expired nonces
AuthNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthNonce = mongoose.model<IAuthNonce>('AuthNonce', AuthNonceSchema);