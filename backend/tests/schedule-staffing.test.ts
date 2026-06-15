import { describe, expect, it } from 'vitest';

import {
  isShiftOverlappingSlot,
  parseTimeToMinutes,
} from '../src/modules/schedules/schedule-staffing.js';

const workShift = {
  type: 'work' as const,
  startTime: '08:00',
  endTime: '16:00',
  isSplit: false,
  startTime2: null,
  endTime2: null,
};

describe('schedule staffing time utilities', () => {
  it('parses HH:mm boundaries', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
    expect(() => parseTimeToMinutes('24:00')).toThrow(RangeError);
    expect(() => parseTimeToMinutes('8:00')).toThrow(RangeError);
  });

  it('uses half-open overlap boundaries', () => {
    expect(isShiftOverlappingSlot(workShift, '07:00', '08:00')).toBe(false);
    expect(isShiftOverlappingSlot(workShift, '15:59', '16:00')).toBe(true);
    expect(isShiftOverlappingSlot(workShift, '16:00', '17:00')).toBe(false);
  });

  it('supports overnight shifts and zero-length intervals', () => {
    const overnight = { ...workShift, startTime: '22:00', endTime: '02:00' };
    expect(isShiftOverlappingSlot(overnight, '23:00', '23:30')).toBe(true);
    expect(isShiftOverlappingSlot(overnight, '01:00', '02:00')).toBe(true);
    expect(isShiftOverlappingSlot(overnight, '02:00', '03:00')).toBe(false);
    expect(
      isShiftOverlappingSlot(
        { ...workShift, startTime: '08:00', endTime: '08:00' },
        '08:00',
        '09:00',
      ),
    ).toBe(false);
    expect(isShiftOverlappingSlot(workShift, '09:00', '09:00')).toBe(false);
  });

  it('supports split shifts and excludes off or leave shifts', () => {
    const split = {
      ...workShift,
      isSplit: true,
      startTime: '08:00',
      endTime: '10:00',
      startTime2: '18:00',
      endTime2: '20:00',
    };
    expect(isShiftOverlappingSlot(split, '09:00', '09:30')).toBe(true);
    expect(isShiftOverlappingSlot(split, '12:00', '13:00')).toBe(false);
    expect(isShiftOverlappingSlot(split, '19:00', '20:00')).toBe(true);
    expect(isShiftOverlappingSlot({ ...workShift, type: 'off' as const }, '08:00', '16:00')).toBe(
      false,
    );
    expect(isShiftOverlappingSlot({ ...workShift, type: 'leave' as const }, '08:00', '16:00')).toBe(
      false,
    );
  });
});
