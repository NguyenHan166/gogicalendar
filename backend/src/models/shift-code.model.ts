import mongoose, { type HydratedDocument, type Model } from 'mongoose';

import {
  EMPLOYEE_STATUSES,
  SHIFT_TYPES,
  type EmployeeStatus,
  type ShiftType,
} from './model.constants.js';

const { model, models, Schema } = mongoose;

export interface ShiftCode {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  type: ShiftType;
  color: string;
  note?: string;
  isSplit: boolean;
  startTime2?: string | null;
  endTime2?: string | null;
  applicableDepartments: string[];
  status: EmployeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ShiftCodeDocument = HydratedDocument<ShiftCode>;

export const shiftCodeSchema = new Schema<ShiftCode>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      immutable: true,
      maxlength: 30,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    breakMinutes: { type: Number, min: 0, default: 0, required: true },
    type: { type: String, enum: SHIFT_TYPES, required: true },
    color: { type: String, required: true, trim: true, maxlength: 50 },
    note: { type: String, trim: true, maxlength: 1000 },
    isSplit: { type: Boolean, default: false, required: true },
    startTime2: { type: String, default: null },
    endTime2: { type: String, default: null },
    applicableDepartments: { type: [String], default: [] },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'active', required: true },
  },
  {
    collection: 'shift_codes',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
  },
);

shiftCodeSchema.index({ code: 1 }, { unique: true, name: 'uq_shift_code' });
shiftCodeSchema.index({ status: 1, type: 1, code: 1 }, { name: 'ix_shift_status_type_code' });
shiftCodeSchema.index(
  { status: 1, applicableDepartments: 1 },
  { name: 'ix_shift_status_departments' },
);

export const ShiftCodeModel =
  (models.ShiftCode as Model<ShiftCode> | undefined) ??
  model<ShiftCode>('ShiftCode', shiftCodeSchema);
