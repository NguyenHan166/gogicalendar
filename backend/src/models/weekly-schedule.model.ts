import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

import {
  PREFERENCE_TYPES,
  SCHEDULE_STATUSES,
  type PreferenceType,
  type ScheduleStatus,
} from './model.constants.js';

const { model, models, Schema } = mongoose;

export interface DayPreference {
  date: Date;
  type: PreferenceType;
  preferredShiftCode?: string;
  note?: string;
}

export interface SchedulePreference {
  _id: Types.ObjectId;
  employeeId: string;
  dayPreferences: DayPreference[];
  submittedAt: Date;
  updatedAt: Date;
  overriddenByEmployeeId?: string;
  overrideReason?: string;
}

export interface ShiftAssignment {
  _id: Types.ObjectId;
  date: Date;
  employeeId: string;
  shiftCode: string;
  primaryRole: string;
  secondaryRole?: string;
  note?: string;
}

export interface ForecastTarget {
  date: Date;
  department: string;
  target: number;
  slotStart?: string;
  slotEnd?: string;
}

export interface WeeklySchedule {
  weekId: string;
  startDate: Date;
  endDate: Date;
  status: ScheduleStatus;
  registrationDeadline?: Date;
  version: number;
  preferences: SchedulePreference[];
  assignments: ShiftAssignment[];
  forecastTargets: ForecastTarget[];
  publishedAt?: Date;
  publishedByEmployeeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WeeklyScheduleDocument = HydratedDocument<WeeklySchedule>;

const dayPreferenceSchema = new Schema<DayPreference>(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: PREFERENCE_TYPES, required: true },
    preferredShiftCode: { type: String, trim: true, uppercase: true },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false, strict: 'throw' },
);

const schedulePreferenceSchema = new Schema<SchedulePreference>(
  {
    employeeId: { type: String, required: true, trim: true },
    dayPreferences: { type: [dayPreferenceSchema], default: [] },
    submittedAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    overriddenByEmployeeId: { type: String, trim: true },
    overrideReason: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true, strict: 'throw' },
);

const shiftAssignmentSchema = new Schema<ShiftAssignment>(
  {
    date: { type: Date, required: true },
    employeeId: { type: String, required: true, trim: true },
    shiftCode: { type: String, required: true, trim: true, uppercase: true },
    primaryRole: { type: String, required: true, trim: true, maxlength: 100 },
    secondaryRole: { type: String, trim: true, maxlength: 100 },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true, strict: 'throw' },
);

const forecastTargetSchema = new Schema<ForecastTarget>(
  {
    date: { type: Date, required: true },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    target: { type: Number, required: true, min: 0 },
    slotStart: { type: String },
    slotEnd: { type: String },
  },
  { _id: false, strict: 'throw' },
);

export const weeklyScheduleSchema = new Schema<WeeklySchedule>(
  {
    weekId: { type: String, required: true, trim: true, immutable: true },
    startDate: { type: Date, required: true, immutable: true },
    endDate: { type: Date, required: true, immutable: true },
    status: { type: String, enum: SCHEDULE_STATUSES, default: 'draft', required: true },
    registrationDeadline: { type: Date },
    preferences: { type: [schedulePreferenceSchema], default: [] },
    assignments: { type: [shiftAssignmentSchema], default: [] },
    forecastTargets: { type: [forecastTargetSchema], default: [] },
    publishedAt: { type: Date },
    publishedByEmployeeId: { type: String, trim: true },
  },
  {
    collection: 'weekly_schedules',
    timestamps: true,
    strict: 'throw',
    autoIndex: false,
    versionKey: 'version',
    optimisticConcurrency: true,
  },
);

weeklyScheduleSchema.index({ weekId: 1 }, { unique: true, name: 'uq_schedule_week_id' });
weeklyScheduleSchema.index({ startDate: 1 }, { unique: true, name: 'uq_schedule_start_date' });
weeklyScheduleSchema.index({ startDate: 1, endDate: 1 }, { name: 'ix_schedule_date_range' });
weeklyScheduleSchema.index({ status: 1, startDate: -1 }, { name: 'ix_schedule_status_start' });
weeklyScheduleSchema.index(
  { 'preferences.employeeId': 1, startDate: -1 },
  { name: 'ix_schedule_preference_employee' },
);
weeklyScheduleSchema.index(
  { 'assignments.employeeId': 1, startDate: -1 },
  { name: 'ix_schedule_assignment_employee' },
);

export const WeeklyScheduleModel =
  (models.WeeklySchedule as Model<WeeklySchedule> | undefined) ??
  model<WeeklySchedule>('WeeklySchedule', weeklyScheduleSchema);
