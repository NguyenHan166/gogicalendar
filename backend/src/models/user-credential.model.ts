import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

import {
  CREDENTIAL_AUTH_TYPES,
  CREDENTIAL_STATUSES,
  type CredentialAuthType,
  type CredentialStatus,
} from './model.constants.js';

const { model, models, Schema } = mongoose;

export interface UserCredential {
  employeeRef: Types.ObjectId;
  username?: string;
  passwordHash?: string;
  authType: CredentialAuthType;
  status: CredentialStatus;
  failedLoginCount: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserCredentialDocument = HydratedDocument<UserCredential>;

export const userCredentialSchema = new Schema<UserCredential>(
  {
    employeeRef: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      immutable: true,
    },
    username: { type: String, trim: true, lowercase: true, maxlength: 100 },
    passwordHash: { type: String, select: false },
    authType: { type: String, enum: CREDENTIAL_AUTH_TYPES, required: true },
    status: { type: String, enum: CREDENTIAL_STATUSES, default: 'active', required: true },
    failedLoginCount: { type: Number, min: 0, default: 0, required: true },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  {
    collection: 'user_credentials',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

userCredentialSchema.index({ employeeRef: 1 }, { unique: true, name: 'uq_credential_employee' });
userCredentialSchema.index(
  { username: 1 },
  {
    unique: true,
    name: 'uq_credential_username',
    partialFilterExpression: { username: { $type: 'string' } },
  },
);
userCredentialSchema.index({ status: 1, lockedUntil: 1 }, { name: 'ix_credential_status_lock' });

export const UserCredentialModel =
  (models.UserCredential as Model<UserCredential> | undefined) ??
  model<UserCredential>('UserCredential', userCredentialSchema);
