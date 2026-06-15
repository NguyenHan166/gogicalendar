import mongoose, { Types, type ClientSession, type FilterQuery } from 'mongoose';

import { AppError } from '../../lib/app-error.js';
import {
  AuditLogModel,
  EmployeeModel,
  ShiftCodeModel,
  WeeklyScheduleModel,
  type DayPreference,
  type Employee,
  type ForecastTarget,
  type SchedulePreference,
  type ShiftAssignment,
  type WeeklySchedule,
} from '../../models/index.js';
import type { ScheduleStatus } from '../../models/model.constants.js';
import type { AuthPrincipal, AuthRequestContext } from '../auth/auth.types.js';
import {
  addDays,
  dayLabelForDate,
  dayLabels,
  emptyDayRecord,
  formatDateOnly,
  isMonday,
  isoWeekId,
  parseDateOnly,
  startOfIsoWeek,
} from './schedule-dates.js';
import { ScheduleRepository } from './schedule.repository.js';
import { isShiftOverlappingSlot, staffingSummary } from './schedule-staffing.js';
import type {
  AssignmentBulkWriteInput,
  AssignmentCreateInput,
  AssignmentPatchInput,
  ForecastWriteInput,
  StaffingSummaryQueryInput,
  ScheduleCreateInput,
  ScheduleCreateNextInput,
  PreferenceListInput,
  PreferenceOverrideInput,
  PreferenceWriteInput,
  ScheduleListInput,
  ScheduleStatusUpdateInput,
} from './schedule.schemas.js';

export interface ScheduleDto {
  weekId: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  version: number;
  registrationDeadline?: string;
  assignments: Record<string, unknown[]>;
  preferences: Array<{
    employeeId: string;
    dayPreferences: Record<
      string,
      {
        type: string;
        preferredShift?: string;
        note?: string;
      }
    >;
  }>;
  forecast: Record<string, Record<string, number>>;
}

export interface PreferenceDto {
  employeeId: string;
  dayPreferences: Record<
    string,
    {
      type: string;
      preferredShift?: string;
      note?: string;
    }
  >;
  submittedAt?: string;
  updatedAt?: string;
  overriddenByEmployeeId?: string;
  overrideReason?: string;
  version: number;
}

export interface ScheduleWarningDto {
  code: string;
  message: string;
  employeeId?: string;
  day?: (typeof dayLabels)[number];
  role?: string;
  assignmentId?: string;
}

export interface ScheduleMutationDto {
  schedule: ScheduleDto;
  warnings: ScheduleWarningDto[];
}

export interface ScheduleValidationDto {
  valid: boolean;
  errors: ScheduleWarningDto[];
  warnings: ScheduleWarningDto[];
}

export interface StaffingSummaryDto {
  days: Record<
    string,
    Record<
      string,
      {
        target: number;
        actual: number;
        variance: number;
        status: 'understaffed' | 'balanced' | 'overstaffed';
        slots?: Record<
          string,
          {
            target: number;
            actual: number;
            variance: number;
            status: 'understaffed' | 'balanced' | 'overstaffed';
          }
        >;
      }
    >
  >;
}

const allowedTransitions: Record<ScheduleStatus, ScheduleStatus[]> = {
  draft: ['registration_open'],
  registration_open: ['registration_locked'],
  registration_locked: ['registration_open', 'scheduling'],
  scheduling: ['published'],
  published: ['scheduling'],
};

function versionConflict(current?: WeeklySchedule | null): AppError {
  return new AppError(409, 'VERSION_CONFLICT', 'Dữ liệu đã được cập nhật bởi người khác', {
    details: current ? [{ currentVersion: current.version, status: current.status }] : [],
  });
}

function duplicateScheduleError(): AppError {
  return new AppError(409, 'SCHEDULE_OVERLAP', 'Tuần lịch bị trùng hoặc chồng lấn');
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function ensureMonday(startDate: Date): void {
  if (!isMonday(startDate)) {
    throw new AppError(400, 'INVALID_WEEK_START', 'Tuần lịch phải bắt đầu vào Thứ 2');
  }
}

function visibleFilter(principal: AuthPrincipal): FilterQuery<WeeklySchedule> {
  if (principal.role === 'manager') return {};
  return { status: { $in: ['published', 'registration_open'] } };
}

function labelToDate(weekStart: Date, dayLabel: (typeof dayLabels)[number]): Date {
  return addDays(weekStart, dayLabels.indexOf(dayLabel));
}

function editableScheduleStatus(status: ScheduleStatus): boolean {
  return status === 'registration_locked' || status === 'scheduling' || status === 'published';
}

function assignmentId(assignment: Pick<ShiftAssignment, '_id'>): string {
  return assignment._id.toString();
}

function scheduleEditAuditAction(
  status: ScheduleStatus,
  resource: 'assignment' | 'forecast',
): string | null {
  if (status === 'registration_locked') return 'schedule.status.transition';
  if (status === 'published') return `schedule.${resource}.edit.published`;
  return null;
}

function employeeSkills(employee: Employee): Record<string, boolean> {
  if (!(employee.skills instanceof Map)) return employee.skills;
  const skills: Record<string, boolean> = {};
  for (const [skill, enabled] of employee.skills.entries() as IterableIterator<[string, boolean]>) {
    skills[skill] = enabled;
  }
  return skills;
}

export class ScheduleService {
  public constructor(private readonly repository = new ScheduleRepository()) {}

  public async create(
    input: ScheduleCreateInput,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleDto> {
    const startDate = parseDateOnly(input.startDate);
    ensureMonday(startDate);
    return this.createForStartDate(startDate, input.registrationDeadline, principal, context);
  }

  public async createNext(
    input: ScheduleCreateNextInput,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleDto> {
    const latest = await this.repository.findLatest();
    const startDate = latest ? addDays(latest.startDate, 7) : startOfIsoWeek(new Date());
    return this.createForStartDate(startDate, input.registrationDeadline, principal, context);
  }

  public async get(weekId: string, principal: AuthPrincipal): Promise<ScheduleDto> {
    const schedule = await this.repository.findByWeekId(weekId);
    if (!schedule || !this.canRead(schedule, principal)) {
      throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');
    }
    return this.toDto(schedule, principal);
  }

  public async list(input: ScheduleListInput, principal: AuthPrincipal) {
    if (
      principal.role !== 'manager' &&
      input.status &&
      input.status !== 'published' &&
      input.status !== 'registration_open'
    ) {
      return {
        data: [],
        meta: { page: input.page, limit: input.limit, total: 0, totalPages: 0 },
      };
    }

    const result = await this.repository.list(input, visibleFilter(principal));
    const schedules = result.schedules.filter((schedule) => this.canRead(schedule, principal));
    return {
      data: schedules.map((schedule) => this.toDto(schedule, principal)),
      meta: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / input.limit),
      },
    };
  }

  public async updateStatus(
    weekId: string,
    input: ScheduleStatusUpdateInput,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleDto> {
    const current = await this.repository.findByWeekId(weekId);
    if (!current) throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');
    if (!allowedTransitions[current.status].includes(input.status)) {
      throw new AppError(
        409,
        'INVALID_STATUS_TRANSITION',
        'Trạng thái lịch không thể chuyển như vậy',
        {
          details: [{ from: current.status, to: input.status }],
        },
      );
    }

    const session = await mongoose.startSession();
    try {
      let updated: WeeklySchedule | null = null;
      await session.withTransaction(async () => {
        updated = await WeeklyScheduleModel.findOneAndUpdate(
          { weekId, version: input.version, status: current.status },
          {
            $set: {
              status: input.status,
              ...(input.status === 'published'
                ? { publishedAt: new Date(), publishedByEmployeeId: principal.employeeId }
                : {}),
            },
            ...(input.status === 'scheduling'
              ? { $unset: { publishedAt: 1, publishedByEmployeeId: 1 } }
              : {}),
            $inc: { version: 1 },
          },
          { new: true, runValidators: true, session },
        ).lean();
        if (!updated) throw versionConflict(await this.repository.findByWeekId(weekId));
        await this.writeAudit(
          {
            action: 'schedule.status.transition',
            changes: { from: current.status, to: input.status, version: input.version },
            context,
            principal,
            resourceId: weekId,
            ...(input.reason ? { reason: input.reason } : {}),
          },
          session,
        );
      });
      if (!updated) throw versionConflict();
      return this.toDto(updated, principal);
    } finally {
      await session.endSession();
    }
  }

  public async getMyPreference(
    weekId: string,
    principal: AuthPrincipal,
  ): Promise<PreferenceDto | null> {
    const employee = await this.ensureActiveEmployee(principal.employeeId);
    if (employee.role !== 'employee') {
      throw new AppError(403, 'FORBIDDEN', 'Bạn chỉ có thể truy cập dữ liệu của chính mình');
    }

    const schedule = await this.repository.findByWeekId(weekId);
    if (!schedule || !this.canRead(schedule, principal)) {
      throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');
    }

    const preference = schedule.preferences.find(
      (item) => item.employeeId === principal.employeeId,
    );
    return preference ? this.toPreferenceDto(preference, schedule) : null;
  }

  public async upsertMyPreference(
    weekId: string,
    input: PreferenceWriteInput,
    principal: AuthPrincipal,
  ): Promise<ScheduleDto> {
    const employee = await this.ensureActiveEmployee(principal.employeeId);
    if (employee.role !== 'employee') {
      throw new AppError(403, 'FORBIDDEN', 'Bạn chỉ có thể cập nhật nguyện vọng của chính mình');
    }

    const current = await this.repository.findByWeekId(weekId);
    if (!current) throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');
    if (current.status !== 'registration_open') {
      throw new AppError(409, 'PREFERENCE_LOCKED', 'Tuần này không còn mở đăng ký nguyện vọng');
    }

    const dayPreferences = await this.normalizePreferenceDays(current, input);
    const updated = await this.upsertPreferenceDocument({
      dayPreferences,
      employeeId: principal.employeeId,
      expectedStatus: 'registration_open',
      version: input.version,
      weekId,
    });
    if (!updated) throw versionConflict(await this.repository.findByWeekId(weekId));
    return this.toDto(updated, principal);
  }

  public async listPreferences(
    weekId: string,
    input: PreferenceListInput,
  ): Promise<PreferenceDto[]> {
    const schedule = await this.repository.findByWeekId(weekId);
    if (!schedule) throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');

    const employees = await EmployeeModel.find({
      role: 'employee',
      status: 'active',
      ...(input.department ? { primaryDepartment: input.department } : {}),
      ...(input.skill ? { [`skills.${input.skill}`]: true } : {}),
    })
      .sort({ name: 1, employeeId: 1 })
      .lean();
    const preferencesByEmployee = new Map(
      schedule.preferences.map((preference) => [preference.employeeId, preference]),
    );

    return employees.flatMap((employee) => {
      const preference = preferencesByEmployee.get(employee.employeeId);
      const submitted = preference !== undefined;
      if (input.submitted !== undefined && input.submitted !== submitted) return [];
      if (
        input.type &&
        (!preference || !preference.dayPreferences.some((day) => day.type === input.type))
      ) {
        return [];
      }
      if (!preference) {
        return [
          {
            employeeId: employee.employeeId,
            dayPreferences: {},
            version: schedule.version,
          },
        ];
      }
      return [this.toPreferenceDto(preference, schedule)];
    });
  }

  public async overridePreference(
    weekId: string,
    employeeId: string,
    input: PreferenceOverrideInput,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleDto> {
    await this.ensureActiveEmployee(employeeId);
    const current = await this.repository.findByWeekId(weekId);
    if (!current) throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');

    const dayPreferences = await this.normalizePreferenceDays(current, input);
    const session = await mongoose.startSession();
    try {
      let updated: WeeklySchedule | null = null;
      await session.withTransaction(async () => {
        updated = await this.upsertPreferenceDocument(
          {
            dayPreferences,
            employeeId,
            overriddenByEmployeeId: principal.employeeId,
            overrideReason: input.reason,
            version: input.version,
            weekId,
          },
          session,
        );
        if (!updated) throw versionConflict(await this.repository.findByWeekId(weekId));
        await this.writeAudit(
          {
            action: 'schedule.preference.override',
            changes: { employeeId, version: input.version },
            context,
            principal,
            reason: input.reason,
            resourceId: weekId,
          },
          session,
        );
      });
      if (!updated) throw versionConflict();
      return this.toDto(updated, principal);
    } finally {
      await session.endSession();
    }
  }

  public async replaceAssignments(
    weekId: string,
    input: AssignmentBulkWriteInput,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleMutationDto> {
    const current = await this.ensureEditableSchedule(weekId);
    const assignments = this.assignmentsFromBulk(current, input);
    const validation = await this.inspectAssignments(current, assignments);
    this.throwAssignmentErrors(validation.errors);

    const updated = await this.updateScheduleDocument({
      current,
      version: input.version,
      set: { assignments },
      principal,
      context,
      resource: 'assignment',
      changes: { operation: 'replace', count: assignments.length },
    });
    return { schedule: this.toDto(updated, principal), warnings: validation.warnings };
  }

  public async createAssignment(
    weekId: string,
    input: AssignmentCreateInput,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleMutationDto> {
    const current = await this.ensureEditableSchedule(weekId);
    const assignments = [
      ...current.assignments,
      this.assignmentFromWrite(current, input.day, input.assignment),
    ];
    const validation = await this.inspectAssignments(current, assignments);
    this.throwAssignmentErrors(validation.errors);

    const updated = await this.updateScheduleDocument({
      current,
      version: input.version,
      set: { assignments },
      principal,
      context,
      resource: 'assignment',
      changes: { operation: 'create', employeeId: input.assignment.employeeId, day: input.day },
    });
    return { schedule: this.toDto(updated, principal), warnings: validation.warnings };
  }

  public async updateAssignment(
    weekId: string,
    assignmentIdParam: string,
    input: AssignmentPatchInput,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleMutationDto> {
    const current = await this.ensureEditableSchedule(weekId);
    const existing = current.assignments.find(
      (assignment) => assignmentId(assignment) === assignmentIdParam,
    );
    if (!existing) throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Không tìm thấy phân ca');

    const assignments: ShiftAssignment[] = current.assignments.map((assignment) => {
      if (assignmentId(assignment) !== assignmentIdParam) return assignment;
      const updated: ShiftAssignment = {
        ...assignment,
        date: input.day ? labelToDate(current.startDate, input.day) : assignment.date,
        shiftCode: input.shiftCode ?? assignment.shiftCode,
        primaryRole: input.primaryRole ?? assignment.primaryRole,
      };
      if (input.secondaryRole) {
        updated.secondaryRole = input.secondaryRole;
      } else if (input.secondaryRole !== null && assignment.secondaryRole) {
        updated.secondaryRole = assignment.secondaryRole;
      }
      if (input.note) {
        updated.note = input.note;
      } else if (input.note !== null && assignment.note) {
        updated.note = assignment.note;
      }
      return updated;
    });
    const validation = await this.inspectAssignments(current, assignments);
    this.throwAssignmentErrors(validation.errors);

    const updated = await this.updateScheduleDocument({
      current,
      version: input.version,
      set: { assignments },
      principal,
      context,
      resource: 'assignment',
      changes: { operation: 'update', assignmentId: assignmentIdParam },
    });
    return { schedule: this.toDto(updated, principal), warnings: validation.warnings };
  }

  public async deleteAssignment(
    weekId: string,
    assignmentIdParam: string,
    version: number,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleMutationDto> {
    const current = await this.ensureEditableSchedule(weekId);
    if (!current.assignments.some((assignment) => assignmentId(assignment) === assignmentIdParam)) {
      throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Không tìm thấy phân ca');
    }

    const updated = await this.updateScheduleDocument({
      current,
      version,
      set: {
        assignments: current.assignments.filter(
          (assignment) => assignmentId(assignment) !== assignmentIdParam,
        ),
      },
      principal,
      context,
      resource: 'assignment',
      changes: { operation: 'delete', assignmentId: assignmentIdParam },
    });
    return { schedule: this.toDto(updated, principal), warnings: [] };
  }

  public async updateForecast(
    weekId: string,
    input: ForecastWriteInput,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleDto> {
    const current = await this.ensureEditableSchedule(weekId);
    const forecastTargets = this.forecastTargetsFromInput(current, input);
    const updated = await this.updateScheduleDocument({
      current,
      version: input.version,
      set: { forecastTargets },
      principal,
      context,
      resource: 'forecast',
      changes: { operation: 'forecast.update' },
    });
    return this.toDto(updated, principal);
  }

  public async staffingSummary(
    weekId: string,
    input: StaffingSummaryQueryInput,
  ): Promise<StaffingSummaryDto> {
    const schedule = await this.repository.findByWeekId(weekId);
    if (!schedule) throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');

    const shiftCodes = [...new Set(schedule.assignments.map((assignment) => assignment.shiftCode))];
    const shifts = await ShiftCodeModel.find({ code: { $in: shiftCodes } }).lean();
    const shiftsByCode = new Map(shifts.map((shift) => [shift.code, shift]));
    const slots = input.slot ?? [];

    const days = emptyDayRecord<Record<string, StaffingSummaryDto['days'][string][string]>>(
      () => ({}),
    );
    for (const dayLabel of dayLabels) {
      const departments = new Set<string>();
      for (const target of schedule.forecastTargets) {
        if (dayLabelForDate(schedule.startDate, target.date) === dayLabel) {
          departments.add(target.department);
        }
      }
      for (const assignment of schedule.assignments) {
        if (dayLabelForDate(schedule.startDate, assignment.date) === dayLabel) {
          departments.add(assignment.primaryRole);
        }
      }

      for (const department of departments) {
        const dailyTarget = schedule.forecastTargets
          .filter(
            (target) =>
              !target.slotStart &&
              !target.slotEnd &&
              target.department === department &&
              dayLabelForDate(schedule.startDate, target.date) === dayLabel,
          )
          .reduce((sum, target) => sum + target.target, 0);
        const dayAssignments = schedule.assignments.filter(
          (assignment) =>
            assignment.primaryRole === department &&
            dayLabelForDate(schedule.startDate, assignment.date) === dayLabel,
        );
        const dailyActual = dayAssignments.filter((assignment) => {
          const shift = shiftsByCode.get(assignment.shiftCode);
          return shift?.type === 'work';
        }).length;
        const summary: StaffingSummaryDto['days'][string][string] = {
          ...staffingSummary(dailyTarget, dailyActual),
          ...(slots.length > 0 ? { slots: {} } : {}),
        };

        for (const slot of slots) {
          const [slotStart, slotEnd] = slot.split('-') as [string, string];
          const slotTarget =
            schedule.forecastTargets.find(
              (target) =>
                target.department === department &&
                dayLabelForDate(schedule.startDate, target.date) === dayLabel &&
                target.slotStart === slotStart &&
                target.slotEnd === slotEnd,
            )?.target ?? dailyTarget;
          const slotActual = dayAssignments.filter((assignment) => {
            const shift = shiftsByCode.get(assignment.shiftCode);
            return shift ? isShiftOverlappingSlot(shift, slotStart, slotEnd) : false;
          }).length;
          summary.slots![slot] = staffingSummary(slotTarget, slotActual);
        }
        days[dayLabel][department] = summary;
      }
    }

    return { days };
  }

  public async validateSchedule(weekId: string): Promise<ScheduleValidationDto> {
    const schedule = await this.repository.findByWeekId(weekId);
    if (!schedule) throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');
    const result = await this.inspectAssignments(schedule, schedule.assignments);
    return {
      valid: result.errors.length === 0,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  private async createForStartDate(
    startDate: Date,
    registrationDeadline: string | undefined,
    principal: AuthPrincipal,
    context: AuthRequestContext,
  ): Promise<ScheduleDto> {
    const endDate = addDays(startDate, 6);
    const weekId = isoWeekId(startDate);
    const overlap = await WeeklyScheduleModel.exists({
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });
    if (overlap) throw duplicateScheduleError();

    const session = await mongoose.startSession();
    try {
      let created: WeeklySchedule | null = null;
      await session.withTransaction(async () => {
        try {
          const docs = await WeeklyScheduleModel.create(
            [
              {
                weekId,
                startDate,
                endDate,
                status: 'draft',
                ...(registrationDeadline
                  ? { registrationDeadline: new Date(registrationDeadline) }
                  : {}),
                preferences: [],
                assignments: [],
                forecastTargets: [],
              },
            ],
            { session },
          );
          created = docs[0]?.toObject() ?? null;
        } catch (error: unknown) {
          if (isDuplicateKey(error)) throw duplicateScheduleError();
          throw error;
        }
        await this.writeAudit(
          {
            action: 'schedule.create',
            changes: { startDate: formatDateOnly(startDate), endDate: formatDateOnly(endDate) },
            context,
            principal,
            resourceId: weekId,
          },
          session,
        );
      });
      if (!created) throw new AppError(500, 'SCHEDULE_CREATE_FAILED', 'Không thể tạo lịch tuần');
      return this.toDto(created, principal);
    } finally {
      await session.endSession();
    }
  }

  private canRead(schedule: WeeklySchedule, principal: AuthPrincipal): boolean {
    if (principal.role === 'manager') return true;
    return schedule.status === 'published' || schedule.status === 'registration_open';
  }

  private async ensureEditableSchedule(weekId: string): Promise<WeeklySchedule> {
    const schedule = await this.repository.findByWeekId(weekId);
    if (!schedule) throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Không tìm thấy lịch tuần');
    if (!editableScheduleStatus(schedule.status)) {
      throw new AppError(
        409,
        'SCHEDULE_NOT_EDITABLE',
        'Chỉ được sửa lịch khi đã khóa đăng ký, đang xếp lịch hoặc đã công bố',
        { details: [{ status: schedule.status }] },
      );
    }
    return schedule;
  }

  private assignmentsFromBulk(
    schedule: WeeklySchedule,
    input: AssignmentBulkWriteInput,
  ): ShiftAssignment[] {
    return dayLabels.flatMap((dayLabel) =>
      input.assignments[dayLabel].map((assignment) =>
        this.assignmentFromWrite(schedule, dayLabel, assignment),
      ),
    );
  }

  private assignmentFromWrite(
    schedule: WeeklySchedule,
    dayLabel: (typeof dayLabels)[number],
    input: AssignmentCreateInput['assignment'],
  ): ShiftAssignment {
    return {
      _id: new Types.ObjectId(),
      date: labelToDate(schedule.startDate, dayLabel),
      employeeId: input.employeeId,
      shiftCode: input.shiftCode,
      primaryRole: input.primaryRole,
      ...(input.secondaryRole ? { secondaryRole: input.secondaryRole } : {}),
      ...(input.note ? { note: input.note } : {}),
    };
  }

  private forecastTargetsFromInput(
    schedule: WeeklySchedule,
    input: ForecastWriteInput,
  ): ForecastTarget[] {
    return dayLabels.flatMap((dayLabel) =>
      Object.entries(input.forecast[dayLabel]).map(([department, target]) => ({
        date: labelToDate(schedule.startDate, dayLabel),
        department,
        target,
      })),
    );
  }

  private async inspectAssignments(
    schedule: WeeklySchedule,
    assignments: ShiftAssignment[],
  ): Promise<{ errors: ScheduleWarningDto[]; warnings: ScheduleWarningDto[] }> {
    const employeeIds = [...new Set(assignments.map((assignment) => assignment.employeeId))];
    const shiftCodes = [...new Set(assignments.map((assignment) => assignment.shiftCode))];
    const [employees, shifts] = await Promise.all([
      EmployeeModel.find({ employeeId: { $in: employeeIds } }).lean(),
      ShiftCodeModel.find({ code: { $in: shiftCodes } }).lean(),
    ]);
    const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
    const shiftsByCode = new Map(shifts.map((shift) => [shift.code, shift]));
    const errors: ScheduleWarningDto[] = [];
    const warnings: ScheduleWarningDto[] = [];
    const employeeDayKeys = new Set<string>();

    for (const assignment of assignments) {
      const day = dayLabelForDate(schedule.startDate, assignment.date);
      if (!day) {
        errors.push({
          code: 'ASSIGNMENT_DAY_OUT_OF_WEEK',
          message: 'Ngày phân ca không thuộc tuần lịch',
          employeeId: assignment.employeeId,
          assignmentId: assignmentId(assignment),
        });
        continue;
      }

      const duplicateKey = `${assignment.employeeId}:${formatDateOnly(assignment.date)}`;
      if (employeeDayKeys.has(duplicateKey)) {
        errors.push({
          code: 'DUPLICATE_EMPLOYEE_DAY',
          message: 'Một nhân viên không thể có hai phân ca trong cùng ngày',
          employeeId: assignment.employeeId,
          day,
        });
      }
      employeeDayKeys.add(duplicateKey);

      const employee = employeesById.get(assignment.employeeId);
      if (!employee || employee.status !== 'active') {
        errors.push({
          code: 'INVALID_ASSIGNMENT_EMPLOYEE',
          message: 'Nhân viên phân ca không tồn tại hoặc không còn hoạt động',
          employeeId: assignment.employeeId,
          day,
        });
      }

      const shift = shiftsByCode.get(assignment.shiftCode);
      if (!shift || shift.status !== 'active') {
        errors.push({
          code: 'INVALID_ASSIGNMENT_SHIFT',
          message: 'Mã ca không tồn tại hoặc không còn hoạt động',
          employeeId: assignment.employeeId,
          day,
        });
      }

      if (employee) {
        warnings.push(...this.skillWarnings(employee, assignment, day));
      }
    }

    return { errors, warnings };
  }

  private skillWarnings(
    employee: Employee,
    assignment: ShiftAssignment,
    day: (typeof dayLabels)[number],
  ): ScheduleWarningDto[] {
    const warnings: ScheduleWarningDto[] = [];
    for (const role of [assignment.primaryRole, assignment.secondaryRole].filter(
      (item): item is string => Boolean(item),
    )) {
      const skills = employeeSkills(employee);
      if (skills[role] !== true) {
        warnings.push({
          code: 'EMPLOYEE_SKILL_MISMATCH',
          message: 'Nhân viên chưa có skill phù hợp với vai trò được xếp',
          employeeId: assignment.employeeId,
          day,
          role,
        });
      }
    }
    return warnings;
  }

  private throwAssignmentErrors(errors: ScheduleWarningDto[]): void {
    if (errors.length === 0) return;
    if (errors.some((error) => error.code === 'DUPLICATE_EMPLOYEE_DAY')) {
      throw new AppError(409, 'DUPLICATE_EMPLOYEE_DAY', 'Nhân viên bị xếp trùng ngày', {
        details: errors.map((error) => ({ ...error })),
      });
    }
    throw new AppError(422, 'INVALID_ASSIGNMENT', 'Phân ca không hợp lệ', {
      details: errors.map((error) => ({ ...error })),
    });
  }

  private async updateScheduleDocument(input: {
    current: WeeklySchedule;
    version: number;
    set: Partial<Pick<WeeklySchedule, 'assignments' | 'forecastTargets'>>;
    principal: AuthPrincipal;
    context: AuthRequestContext;
    resource: 'assignment' | 'forecast';
    changes: Record<string, unknown>;
  }): Promise<WeeklySchedule> {
    const nextStatus =
      input.current.status === 'registration_locked' ? 'scheduling' : input.current.status;
    const auditAction = scheduleEditAuditAction(input.current.status, input.resource);
    const update = {
      $set: {
        ...input.set,
        status: nextStatus,
      },
      $inc: { version: 1 },
    };

    const runUpdate = async (session?: ClientSession): Promise<WeeklySchedule | null> =>
      WeeklyScheduleModel.findOneAndUpdate(
        { weekId: input.current.weekId, version: input.version, status: input.current.status },
        update,
        { new: true, runValidators: true, ...(session ? { session } : {}) },
      ).lean();

    if (!auditAction) {
      const updated = await runUpdate();
      if (!updated) throw versionConflict(await this.repository.findByWeekId(input.current.weekId));
      return updated;
    }

    const session = await mongoose.startSession();
    try {
      let updated: WeeklySchedule | null = null;
      await session.withTransaction(async () => {
        updated = await runUpdate(session);
        if (!updated)
          throw versionConflict(await this.repository.findByWeekId(input.current.weekId));
        await this.writeAudit(
          {
            action: auditAction,
            changes:
              input.current.status === 'registration_locked'
                ? {
                    from: 'registration_locked',
                    to: 'scheduling',
                    reason: 'assignment_or_forecast_edit',
                    ...input.changes,
                  }
                : input.changes,
            context: input.context,
            principal: input.principal,
            resourceId: input.current.weekId,
          },
          session,
        );
      });
      if (!updated) throw versionConflict();
      return updated;
    } finally {
      await session.endSession();
    }
  }

  private async ensureActiveEmployee(employeeId: string) {
    const employee = await EmployeeModel.findOne({ employeeId }).lean();
    if (!employee) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Không tìm thấy nhân viên');
    if (employee.status !== 'active') {
      throw new AppError(403, 'EMPLOYEE_INACTIVE', 'Nhân viên không còn hoạt động');
    }
    return employee;
  }

  private async normalizePreferenceDays(
    schedule: WeeklySchedule,
    input: PreferenceWriteInput,
  ): Promise<DayPreference[]> {
    const preferredShiftCodes = new Set<string>();
    for (const preference of Object.values(input.dayPreferences)) {
      if (preference.type === 'preferred' && preference.preferredShift) {
        preferredShiftCodes.add(preference.preferredShift);
      }
    }

    if (preferredShiftCodes.size > 0) {
      const shifts = await ShiftCodeModel.find({
        code: { $in: [...preferredShiftCodes] },
        status: 'active',
        type: 'work',
      }).lean();
      const validCodes = new Set(shifts.map((shift) => shift.code));
      const invalidCodes = [...preferredShiftCodes].filter((code) => !validCodes.has(code));
      if (invalidCodes.length > 0) {
        throw new AppError(422, 'INVALID_PREFERRED_SHIFT', 'Ca preferred không hợp lệ', {
          details: invalidCodes.map((code) => ({ code })),
        });
      }
    }

    return dayLabels.map((dayLabel) => {
      const preference = input.dayPreferences[dayLabel];
      return {
        date: labelToDate(schedule.startDate, dayLabel),
        type: preference.type,
        ...(preference.type === 'preferred' && preference.preferredShift
          ? { preferredShiftCode: preference.preferredShift }
          : {}),
        ...(preference.note ? { note: preference.note } : {}),
      };
    });
  }

  private async upsertPreferenceDocument(
    input: {
      dayPreferences: DayPreference[];
      employeeId: string;
      expectedStatus?: ScheduleStatus;
      overriddenByEmployeeId?: string;
      overrideReason?: string;
      version: number;
      weekId: string;
    },
    session?: ClientSession,
  ): Promise<WeeklySchedule | null> {
    const now = new Date();
    const replacement = {
      _id: new Types.ObjectId(),
      employeeId: input.employeeId,
      dayPreferences: input.dayPreferences,
      submittedAt: now,
      updatedAt: now,
      ...(input.overriddenByEmployeeId
        ? { overriddenByEmployeeId: input.overriddenByEmployeeId }
        : {}),
      ...(input.overrideReason ? { overrideReason: input.overrideReason } : {}),
    };
    const updatedFields = {
      dayPreferences: input.dayPreferences,
      updatedAt: now,
      ...(input.overriddenByEmployeeId
        ? { overriddenByEmployeeId: input.overriddenByEmployeeId }
        : {}),
      ...(input.overrideReason ? { overrideReason: input.overrideReason } : {}),
    };

    return WeeklyScheduleModel.findOneAndUpdate(
      {
        weekId: input.weekId,
        version: input.version,
        ...(input.expectedStatus ? { status: input.expectedStatus } : {}),
      },
      [
        {
          $set: {
            preferences: {
              $cond: [
                {
                  $in: [
                    input.employeeId,
                    {
                      $map: {
                        input: '$preferences',
                        as: 'preference',
                        in: '$$preference.employeeId',
                      },
                    },
                  ],
                },
                {
                  $map: {
                    input: '$preferences',
                    as: 'preference',
                    in: {
                      $cond: [
                        { $eq: ['$$preference.employeeId', input.employeeId] },
                        { $mergeObjects: ['$$preference', updatedFields] },
                        '$$preference',
                      ],
                    },
                  },
                },
                { $concatArrays: ['$preferences', [replacement]] },
              ],
            },
            version: { $add: ['$version', 1] },
          },
        },
      ],
      { new: true, ...(session ? { session } : {}) },
    ).lean();
  }

  private toPreferenceDto(preference: SchedulePreference, schedule: WeeklySchedule): PreferenceDto {
    const dayPreferences: PreferenceDto['dayPreferences'] = {};
    for (const dayPreference of preference.dayPreferences) {
      const dayLabel = dayLabelForDate(schedule.startDate, dayPreference.date);
      if (!dayLabel) continue;
      dayPreferences[dayLabel] = {
        type: dayPreference.type,
        ...(dayPreference.preferredShiftCode
          ? { preferredShift: dayPreference.preferredShiftCode }
          : {}),
        ...(dayPreference.note ? { note: dayPreference.note } : {}),
      };
    }
    return {
      employeeId: preference.employeeId,
      dayPreferences,
      submittedAt: preference.submittedAt.toISOString(),
      updatedAt: preference.updatedAt.toISOString(),
      ...(preference.overriddenByEmployeeId
        ? { overriddenByEmployeeId: preference.overriddenByEmployeeId }
        : {}),
      ...(preference.overrideReason ? { overrideReason: preference.overrideReason } : {}),
      version: schedule.version,
    };
  }

  private toDto(schedule: WeeklySchedule, principal: AuthPrincipal): ScheduleDto {
    const assignments = emptyDayRecord<unknown[]>(() => []);
    if (principal.role === 'manager' || schedule.status === 'published') {
      for (const assignment of schedule.assignments) {
        const dayLabel = dayLabelForDate(schedule.startDate, assignment.date);
        if (!dayLabel) continue;
        assignments[dayLabel].push({
          assignmentId: assignment._id.toString(),
          employeeId: assignment.employeeId,
          shiftCode: assignment.shiftCode,
          primaryRole: assignment.primaryRole,
          ...(assignment.secondaryRole ? { secondaryRole: assignment.secondaryRole } : {}),
          ...(assignment.note ? { note: assignment.note } : {}),
        });
      }
    }

    const preferences = schedule.preferences
      .filter(
        (preference) =>
          principal.role === 'manager' || preference.employeeId === principal.employeeId,
      )
      .map((preference) => {
        const dayPreferences: ScheduleDto['preferences'][number]['dayPreferences'] = {};
        for (const dayPreference of preference.dayPreferences) {
          const dayLabel = dayLabelForDate(schedule.startDate, dayPreference.date);
          if (!dayLabel) continue;
          dayPreferences[dayLabel] = {
            type: dayPreference.type,
            ...(dayPreference.preferredShiftCode
              ? { preferredShift: dayPreference.preferredShiftCode }
              : {}),
            ...(dayPreference.note ? { note: dayPreference.note } : {}),
          };
        }
        return { employeeId: preference.employeeId, dayPreferences };
      });

    const forecast = emptyDayRecord<Record<string, number>>(() => ({}));
    for (const target of schedule.forecastTargets) {
      const dayLabel = dayLabelForDate(schedule.startDate, target.date);
      if (!dayLabel) continue;
      forecast[dayLabel][target.department] = target.target;
    }

    return {
      weekId: schedule.weekId,
      startDate: formatDateOnly(schedule.startDate),
      endDate: formatDateOnly(schedule.endDate),
      status: schedule.status,
      version: schedule.version,
      ...(schedule.registrationDeadline
        ? { registrationDeadline: schedule.registrationDeadline.toISOString() }
        : {}),
      assignments,
      preferences,
      forecast,
    };
  }

  private async writeAudit(
    input: {
      action: string;
      changes?: Record<string, unknown>;
      context: AuthRequestContext;
      principal: AuthPrincipal;
      reason?: string;
      resourceId: string;
    },
    session: ClientSession,
  ): Promise<void> {
    await AuditLogModel.create(
      [
        {
          action: input.action,
          resourceType: 'weekly_schedule',
          resourceId: input.resourceId,
          actorEmployeeId: input.principal.employeeId,
          actorRole: input.principal.role,
          outcome: 'success',
          ...(input.context.requestId ? { requestId: input.context.requestId } : {}),
          ...(input.context.ip ? { ip: input.context.ip } : {}),
          ...(input.context.userAgent ? { userAgent: input.context.userAgent } : {}),
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.changes ? { changes: input.changes } : {}),
        },
      ],
      { session },
    );
  }
}
