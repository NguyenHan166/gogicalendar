import type { FilterQuery } from 'mongoose';

import { normalizePhone } from '../../lib/phone.js';
import { EmployeeModel, UserCredentialModel, type Employee } from '../../models/index.js';
import type {
  EmployeeCreateInput,
  EmployeeListInput,
  EmployeeUpdateInput,
} from './employee.schemas.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formattedPhoneRegex(phone: string): RegExp {
  return new RegExp(`^${phone.split('').map(escapeRegex).join('\\D*')}$`);
}

export class EmployeeRepository {
  public async create(employeeId: string, input: EmployeeCreateInput): Promise<Employee> {
    return (
      await EmployeeModel.create({
        employeeId,
        name: input.name,
        phone: normalizePhone(input.phone),
        role: input.role,
        level: input.level,
        scheduleGroup: input.scheduleGroup,
        primaryDepartment: input.primaryDepartment,
        skills: input.skills,
        ...(input.note ? { note: input.note } : {}),
        status: input.status,
      })
    ).toObject({ flattenMaps: true });
  }

  public async findById(employeeId: string): Promise<Employee | null> {
    return EmployeeModel.findOne({ employeeId }).lean();
  }

  public async findByPhone(phone: string, excludedEmployeeId?: string): Promise<Employee | null> {
    const filter: FilterQuery<Employee> = {
      $or: [{ phone }, { phone: formattedPhoneRegex(phone) }],
    };
    if (excludedEmployeeId) filter.employeeId = { $ne: excludedEmployeeId };
    return EmployeeModel.findOne(filter).lean();
  }

  public async idExists(employeeId: string): Promise<boolean> {
    return (await EmployeeModel.exists({ employeeId })) !== null;
  }

  public async list(input: EmployeeListInput): Promise<{ employees: Employee[]; total: number }> {
    const filter: FilterQuery<Employee> = {};
    if (input.level) filter.level = input.level;
    if (input.scheduleGroup) filter.scheduleGroup = input.scheduleGroup;
    if (input.primaryDepartment) filter.primaryDepartment = input.primaryDepartment;
    if (input.status) filter.status = input.status;
    if (input.skill) filter[`skills.${input.skill}`] = true;

    if (input.search) {
      const search = new RegExp(escapeRegex(input.search), 'i');
      const normalizedPhone = normalizePhone(input.search);
      filter.$or = [
        { name: search },
        { employeeId: search },
        { phone: normalizedPhone ? formattedPhoneRegex(normalizedPhone) : search },
      ];
    }

    const [employees, total] = await Promise.all([
      EmployeeModel.find(filter)
        .sort({ name: 1, employeeId: 1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean(),
      EmployeeModel.countDocuments(filter),
    ]);
    return { employees, total };
  }

  public async update(employeeId: string, input: EmployeeUpdateInput): Promise<Employee | null> {
    return EmployeeModel.findOneAndUpdate(
      { employeeId },
      {
        $set: {
          name: input.name,
          phone: normalizePhone(input.phone),
          role: input.role,
          level: input.level,
          scheduleGroup: input.scheduleGroup,
          primaryDepartment: input.primaryDepartment,
          skills: input.skills,
          status: input.status,
          ...(input.note ? { note: input.note } : {}),
        },
        ...(input.note ? {} : { $unset: { note: 1 } }),
      },
      { new: true, runValidators: true },
    ).lean();
  }

  public async updateStatus(
    employeeId: string,
    status: Employee['status'],
  ): Promise<Employee | null> {
    const employee = await EmployeeModel.findOneAndUpdate(
      { employeeId },
      { $set: { status } },
      { new: true, runValidators: true },
    );

    if (employee) {
      await UserCredentialModel.updateMany(
        { employeeRef: employee._id },
        { $set: { status: status === 'active' ? 'active' : 'disabled' } },
      );
    }
    return (employee?.toObject({ flattenMaps: true }) as Employee | undefined) ?? null;
  }
}
