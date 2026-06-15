import { AppError } from '../../lib/app-error.js';
import type { EmployeeRole, ShiftCode } from '../../models/index.js';
import { ShiftRepository } from './shift.repository.js';
import type { ShiftCreateInput, ShiftListInput, ShiftUpdateInput } from './shift.schemas.js';

export interface ShiftDto {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  type: ShiftCode['type'];
  color: string;
  note?: string;
  isSplit: boolean;
  startTime2: string | null;
  endTime2: string | null;
  applicableDepartments: string[];
  status: ShiftCode['status'];
}

function toDto(shift: ShiftCode): ShiftDto {
  return {
    code: shift.code,
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakMinutes: shift.breakMinutes,
    type: shift.type,
    color: shift.color,
    ...(shift.note ? { note: shift.note } : {}),
    isSplit: shift.isSplit,
    startTime2: shift.startTime2 ?? null,
    endTime2: shift.endTime2 ?? null,
    applicableDepartments: shift.applicableDepartments,
    status: shift.status,
  };
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export class ShiftService {
  public constructor(private readonly repository = new ShiftRepository()) {}

  public async create(input: ShiftCreateInput): Promise<ShiftDto> {
    const code = input.code.toUpperCase();
    if (await this.repository.findByCode(code)) {
      throw new AppError(409, 'SHIFT_CODE_EXISTS', 'Mã ca đã tồn tại');
    }
    try {
      return toDto(await this.repository.create(code, input));
    } catch (error: unknown) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'SHIFT_CODE_EXISTS', 'Mã ca đã tồn tại');
      }
      throw error;
    }
  }

  public async get(code: string, role: EmployeeRole): Promise<ShiftDto> {
    const shift = await this.repository.findByCode(code.toUpperCase());
    if (!shift || (role !== 'manager' && shift.status !== 'active')) {
      throw new AppError(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy mã ca');
    }
    return toDto(shift);
  }

  public async list(input: ShiftListInput, role: EmployeeRole) {
    const result = await this.repository.list(input, role === 'manager' ? undefined : 'active');
    return {
      data: result.shifts.map(toDto),
      meta: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / input.limit),
      },
    };
  }

  public async update(code: string, input: ShiftUpdateInput): Promise<ShiftDto> {
    const shift = await this.repository.update(code.toUpperCase(), input);
    if (!shift) throw new AppError(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy mã ca');
    return toDto(shift);
  }

  public async updateStatus(code: string, status: ShiftCode['status']): Promise<ShiftDto> {
    const shift = await this.repository.updateStatus(code.toUpperCase(), status);
    if (!shift) throw new AppError(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy mã ca');
    return toDto(shift);
  }
}
