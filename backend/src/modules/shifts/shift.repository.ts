import type { FilterQuery } from 'mongoose';

import { ShiftCodeModel, type ShiftCode } from '../../models/index.js';
import type { ShiftCreateInput, ShiftListInput, ShiftUpdateInput } from './shift.schemas.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function persistenceFields(input: ShiftCreateInput | ShiftUpdateInput) {
  return {
    name: input.name,
    startTime: input.startTime,
    endTime: input.endTime,
    breakMinutes: input.breakMinutes,
    type: input.type,
    color: input.color,
    isSplit: input.isSplit,
    startTime2: input.isSplit ? input.startTime2 : null,
    endTime2: input.isSplit ? input.endTime2 : null,
    applicableDepartments: input.applicableDepartments,
    status: input.status,
    ...(input.note ? { note: input.note } : {}),
  };
}

export class ShiftRepository {
  public async create(code: string, input: ShiftCreateInput): Promise<ShiftCode> {
    return (await ShiftCodeModel.create({ code, ...persistenceFields(input) })).toObject();
  }

  public async findByCode(code: string): Promise<ShiftCode | null> {
    return ShiftCodeModel.findOne({ code }).lean();
  }

  public async list(
    input: ShiftListInput,
    forcedStatus?: ShiftCode['status'],
  ): Promise<{ shifts: ShiftCode[]; total: number }> {
    const filter: FilterQuery<ShiftCode> = {};
    if (input.type) filter.type = input.type;
    if (forcedStatus) filter.status = forcedStatus;
    else if (input.status) filter.status = input.status;
    if (input.department) filter.applicableDepartments = input.department;
    if (input.search) {
      const search = new RegExp(escapeRegex(input.search), 'i');
      filter.$or = [{ code: search }, { name: search }];
    }

    const [shifts, total] = await Promise.all([
      ShiftCodeModel.find(filter)
        .sort({ code: 1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean(),
      ShiftCodeModel.countDocuments(filter),
    ]);
    return { shifts, total };
  }

  public async update(code: string, input: ShiftUpdateInput): Promise<ShiftCode | null> {
    return ShiftCodeModel.findOneAndUpdate(
      { code },
      {
        $set: persistenceFields(input),
        ...(input.note ? {} : { $unset: { note: 1 } }),
      },
      { new: true, runValidators: true },
    ).lean();
  }

  public async updateStatus(code: string, status: ShiftCode['status']): Promise<ShiftCode | null> {
    return ShiftCodeModel.findOneAndUpdate(
      { code },
      { $set: { status } },
      { new: true, runValidators: true },
    ).lean();
  }
}
