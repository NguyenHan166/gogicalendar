import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

const { model, models, Schema } = mongoose;

export interface RefreshToken {
  credentialRef: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenHash?: string;
  createdByIp?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

export const refreshTokenSchema = new Schema<RefreshToken>(
  {
    credentialRef: {
      type: Schema.Types.ObjectId,
      ref: 'UserCredential',
      required: true,
      immutable: true,
    },
    tokenHash: { type: String, required: true, select: false, immutable: true },
    familyId: { type: String, required: true, trim: true, immutable: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByTokenHash: { type: String, select: false },
    createdByIp: { type: String, maxlength: 100 },
    userAgent: { type: String, maxlength: 1000 },
  },
  {
    collection: 'refresh_tokens',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true, name: 'uq_refresh_token_hash' });
refreshTokenSchema.index(
  { credentialRef: 1, familyId: 1 },
  { name: 'ix_refresh_credential_family' },
);
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_refresh_expiry' });

export const RefreshTokenModel =
  (models.RefreshToken as Model<RefreshToken> | undefined) ??
  model<RefreshToken>('RefreshToken', refreshTokenSchema);
