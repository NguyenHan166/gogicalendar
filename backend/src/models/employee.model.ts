import mongoose, { type HydratedDocument, type Model } from 'mongoose';

import {
  EMPLOYEE_ROLES,
  EMPLOYEE_STATUSES,
  type EmployeeRole,
  type EmployeeStatus,
} from './model.constants.js';

const { model, models, Schema } = mongoose;

export interface Employee {
  employeeId: string;
  name: string;
  phone: string;
  role: EmployeeRole;
  level: string;
  scheduleGroup: string;
  primaryDepartment: string;
  skills: Record<string, boolean>;
  note?: string;
  status: EmployeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type EmployeeDocument = HydratedDocument<Employee>;

export const employeeSchema = new Schema<Employee>(
  {
    employeeId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: EMPLOYEE_ROLES, required: true },
    level: { type: String, required: true, trim: true, maxlength: 50 },
    scheduleGroup: { type: String, required: true, trim: true, maxlength: 100 },
    primaryDepartment: { type: String, required: true, trim: true, maxlength: 100 },
    skills: { type: Map, of: Boolean, default: {} },
    note: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'active', required: true },
  },
  {
    collection: 'employees',
    timestamps: true,
    strict: 'throw',
    minimize: true,
    autoIndex: false,
  },
);

employeeSchema.index({ employeeId: 1 }, { unique: true, name: 'uq_employee_id' });
employeeSchema.index({ phone: 1 }, { unique: true, name: 'uq_employee_phone' });
employeeSchema.index(
  { status: 1, scheduleGroup: 1, name: 1 },
  { name: 'ix_employee_status_group_name' },
);
employeeSchema.index(
  { status: 1, primaryDepartment: 1 },
  { name: 'ix_employee_status_department' },
);
employeeSchema.index(
  { name: 'text', employeeId: 'text', phone: 'text' },
  { name: 'tx_employee_search', weights: { employeeId: 10, phone: 8, name: 5 } },
);

export const EmployeeModel =
  (models.Employee as Model<Employee> | undefined) ?? model<Employee>('Employee', employeeSchema);
