import { randomBytes } from 'node:crypto';

import { AppError } from '../../lib/app-error.js';
import { normalizePhone } from '../../lib/phone.js';
import type { Employee } from '../../models/index.js';
import { EmployeeRepository } from './employee.repository.js';
import type {
  EmployeeCreateInput,
  EmployeeListInput,
  EmployeeUpdateInput,
} from './employee.schemas.js';

export interface EmployeeDto {
  id: string;
  name: string;
  phone: string;
  role: Employee['role'];
  level: string;
  scheduleGroup: string;
  primaryDepartment: string;
  skills: Record<string, boolean>;
  note?: string;
  status: Employee['status'];
}

function toDto(employee: Employee): EmployeeDto {
  return {
    id: employee.employeeId,
    name: employee.name,
    phone: employee.phone,
    role: employee.role,
    level: employee.level,
    scheduleGroup: employee.scheduleGroup,
    primaryDepartment: employee.primaryDepartment,
    skills: { ...employee.skills },
    ...(employee.note ? { note: employee.note } : {}),
    status: employee.status,
  };
}

function duplicateError(field: 'id' | 'phone'): AppError {
  return new AppError(
    409,
    field === 'id' ? 'EMPLOYEE_ID_EXISTS' : 'EMPLOYEE_PHONE_EXISTS',
    field === 'id' ? 'ID nhân viên đã tồn tại' : 'Số điện thoại đã tồn tại',
  );
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export class EmployeeService {
  public constructor(private readonly repository = new EmployeeRepository()) {}

  public async create(input: EmployeeCreateInput): Promise<EmployeeDto> {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Số điện thoại không hợp lệ');
    }
    if (await this.repository.findByPhone(phone)) throw duplicateError('phone');

    const employeeId = input.id ?? (await this.generateHubId());
    if (await this.repository.idExists(employeeId)) throw duplicateError('id');

    try {
      return toDto(await this.repository.create(employeeId, { ...input, phone }));
    } catch (error: unknown) {
      if (isDuplicateKey(error)) {
        if (await this.repository.findByPhone(phone)) throw duplicateError('phone');
        throw duplicateError('id');
      }
      throw error;
    }
  }

  public async get(employeeId: string): Promise<EmployeeDto> {
    const employee = await this.repository.findById(employeeId);
    if (!employee) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Không tìm thấy nhân viên');
    return toDto(employee);
  }

  public async list(input: EmployeeListInput) {
    const result = await this.repository.list(input);
    return {
      data: result.employees.map(toDto),
      meta: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / input.limit),
      },
    };
  }

  public async update(employeeId: string, input: EmployeeUpdateInput): Promise<EmployeeDto> {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Số điện thoại không hợp lệ');
    }
    if (await this.repository.findByPhone(phone, employeeId)) throw duplicateError('phone');

    try {
      const employee = await this.repository.update(employeeId, { ...input, phone });
      if (!employee) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Không tìm thấy nhân viên');
      return toDto((await this.repository.updateStatus(employeeId, input.status)) ?? employee);
    } catch (error: unknown) {
      if (isDuplicateKey(error)) throw duplicateError('phone');
      throw error;
    }
  }

  public async updateStatus(employeeId: string, status: Employee['status']): Promise<EmployeeDto> {
    const employee = await this.repository.updateStatus(employeeId, status);
    if (!employee) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Không tìm thấy nhân viên');
    return toDto(employee);
  }

  private async generateHubId(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const id = `HUB_${Date.now()}_${randomBytes(3).toString('hex')}`;
      if (!(await this.repository.idExists(id))) return id;
    }
    throw new AppError(500, 'HUB_ID_GENERATION_FAILED', 'Không thể tạo ID nhân viên HUB');
  }
}
