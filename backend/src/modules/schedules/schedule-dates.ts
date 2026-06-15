import { AppError } from '../../lib/app-error.js';

export const dayLabels = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ Nhật',
] as const;

const dateOnlyFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
  year: 'numeric',
});

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Ngày không hợp lệ');
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (formatDateOnly(date) !== value) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Ngày không hợp lệ');
  }
  return date;
}

export function formatDateOnly(date: Date): string {
  return dateOnlyFormatter.format(date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function startOfIsoWeek(date: Date): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const mondayBasedDay = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - mondayBasedDay);
  return start;
}

export function isMonday(date: Date): boolean {
  return date.getUTCDay() === 1;
}

export function dayLabelForDate(weekStart: Date, date: Date): (typeof dayLabels)[number] | null {
  const startTime = Date.UTC(
    weekStart.getUTCFullYear(),
    weekStart.getUTCMonth(),
    weekStart.getUTCDate(),
  );
  const dateTime = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diff = Math.floor((dateTime - startTime) / 86_400_000);
  return diff >= 0 && diff < dayLabels.length ? (dayLabels[diff] ?? null) : null;
}

export function emptyDayRecord<T>(factory: () => T): Record<(typeof dayLabels)[number], T> {
  return Object.fromEntries(dayLabels.map((label) => [label, factory()])) as Record<
    (typeof dayLabels)[number],
    T
  >;
}

export function isoWeekId(weekStart: Date): string {
  const thursday = addDays(startOfIsoWeek(weekStart), 3);
  const isoYear = thursday.getUTCFullYear();
  const weekOne = startOfIsoWeek(new Date(Date.UTC(isoYear, 0, 4)));
  const week = Math.floor((weekStart.getTime() - weekOne.getTime()) / 604_800_000) + 1;
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}
