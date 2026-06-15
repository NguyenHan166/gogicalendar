import type { FilterQuery } from 'mongoose';

import { WeeklyScheduleModel, type WeeklySchedule } from '../../models/index.js';
import type { ScheduleListInput } from './schedule.schemas.js';

export class ScheduleRepository {
  public async findByWeekId(weekId: string): Promise<WeeklySchedule | null> {
    return WeeklyScheduleModel.findOne({ weekId }).lean();
  }

  public async findLatest(): Promise<WeeklySchedule | null> {
    return WeeklyScheduleModel.findOne().sort({ startDate: -1 }).lean();
  }

  public async list(
    input: ScheduleListInput,
    extraFilter: FilterQuery<WeeklySchedule> = {},
  ): Promise<{ schedules: WeeklySchedule[]; total: number }> {
    const filter: FilterQuery<WeeklySchedule> = { ...extraFilter };
    const startDate: { $gte?: Date; $lte?: Date } = {};
    if (input.status) filter.status = input.status;
    if (input.year) {
      startDate.$gte = new Date(Date.UTC(input.year, 0, 1));
      startDate.$lte = new Date(Date.UTC(input.year, 11, 31, 23, 59, 59, 999));
    }
    if (input.from || input.to) {
      if (input.from) startDate.$gte = new Date(`${input.from}T00:00:00.000Z`);
      if (input.to) startDate.$lte = new Date(`${input.to}T23:59:59.999Z`);
    }
    if (Object.keys(startDate).length > 0) filter.startDate = startDate;

    const [schedules, total] = await Promise.all([
      WeeklyScheduleModel.find(filter)
        .sort({ startDate: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean(),
      WeeklyScheduleModel.countDocuments(filter),
    ]);
    return { schedules, total };
  }
}
