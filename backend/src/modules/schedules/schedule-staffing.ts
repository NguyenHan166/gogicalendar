import type { ShiftCode } from '../../models/index.js';

interface Interval {
  start: number;
  end: number;
}

export interface StaffingSlotSummary {
  target: number;
  actual: number;
  variance: number;
  status: 'understaffed' | 'balanced' | 'overstaffed';
}

export function parseTimeToMinutes(value: string): number {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new RangeError('Time must be HH:mm');
  return Number(match[1]) * 60 + Number(match[2]);
}

function interval(startTime?: string | null, endTime?: string | null): Interval[] {
  if (!startTime || !endTime) return [];
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === end) return [];
  return [{ start, end: end < start ? end + 1440 : end }];
}

function overlaps(left: Interval, right: Interval): boolean {
  return Math.max(left.start, right.start) < Math.min(left.end, right.end);
}

export function shiftIntervals(
  shift: Pick<ShiftCode, 'type' | 'startTime' | 'endTime' | 'isSplit' | 'startTime2' | 'endTime2'>,
): Interval[] {
  if (shift.type !== 'work') return [];
  return [
    ...interval(shift.startTime, shift.endTime),
    ...(shift.isSplit ? interval(shift.startTime2, shift.endTime2) : []),
  ];
}

export function isShiftOverlappingSlot(
  shift: Pick<ShiftCode, 'type' | 'startTime' | 'endTime' | 'isSplit' | 'startTime2' | 'endTime2'>,
  slotStartTime: string,
  slotEndTime: string,
): boolean {
  const shiftParts = shiftIntervals(shift);
  const slotParts = interval(slotStartTime, slotEndTime);
  if (shiftParts.length === 0 || slotParts.length === 0) return false;

  const comparableSlots = slotParts.flatMap((slot) => [
    slot,
    { start: slot.start + 1440, end: slot.end + 1440 },
  ]);
  return shiftParts.some((shiftPart) =>
    comparableSlots.some((slotPart) => overlaps(shiftPart, slotPart)),
  );
}

export function staffingStatus(target: number, actual: number): StaffingSlotSummary['status'] {
  if (actual < target) return 'understaffed';
  if (actual > target) return 'overstaffed';
  return 'balanced';
}

export function staffingSummary(target: number, actual: number): StaffingSlotSummary {
  return {
    target,
    actual,
    variance: actual - target,
    status: staffingStatus(target, actual),
  };
}
