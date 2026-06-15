export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: 'employee' | 'manager';
  level: string; // QLC, RM, S1.1-S3.3, HUB, NEW
  scheduleGroup: string; // Display group in schedule table
  primaryDepartment: string;
  skills: { [key: string]: boolean };
  note?: string;
  status: 'active' | 'inactive';
}

export interface ShiftCode {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  type: 'work' | 'off' | 'leave';
  color: string;
  note?: string;
  startTime2?: string | null;
  endTime2?: string | null;
  isSplit?: boolean;
}

export interface EmployeePreference {
  employeeId: string;
  dayPreferences: {
    [dayOfWeek: string]: {
      type: 'available' | 'preferred' | 'unavailable';
      preferredShift?: string;
      note?: string;
    };
  };
}

export interface ShiftAssignment {
  employeeId: string;
  shiftCode: string;
  primaryRole: string;
  secondaryRole?: string;
  note?: string;
}

export interface WeeklySchedule {
  weekId: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'registration_open' | 'registration_locked' | 'scheduling' | 'published';
  assignments: { [dayOfWeek: string]: ShiftAssignment[] };
  preferences: EmployeePreference[];
  forecast: { [dayOfWeek: string]: { [department: string]: number } };
}

export const scheduleGroupOrder = [
  'BAN QUẢN LÝ',
  'ORDER + PHỤC VỤ',
  'BOY',
  'BOH (BẾP)',
  'TẠP VỤ',
  'BAR',
];

export const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

export const mockShiftCodes: ShiftCode[] = [
  { code: "Danh sách ca", name: "", startTime: "", endTime: "", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A1", name: "12:00-19:30", startTime: "12:00", endTime: "19:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A10", name: "16:30-00:00", startTime: "16:30", endTime: "00:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A11", name: "17:00-00:30", startTime: "17:00", endTime: "00:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A12", name: "17:30-01:00", startTime: "17:30", endTime: "01:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A13", name: "18:00-01:30", startTime: "18:00", endTime: "01:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A14", name: "18:30-02:00", startTime: "18:30", endTime: "02:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A15", name: "12:00-20:30", startTime: "12:00", endTime: "20:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A16", name: "12:30-21:00", startTime: "12:30", endTime: "21:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A17", name: "13:00-21:30", startTime: "13:00", endTime: "21:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A18", name: "13:30-22:00", startTime: "13:30", endTime: "22:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A19", name: "14:00-22:30", startTime: "14:00", endTime: "22:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A2", name: "12:30-20:00", startTime: "12:30", endTime: "20:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A20", name: "14:30-23:00", startTime: "14:30", endTime: "23:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A21", name: "15:00-23:30", startTime: "15:00", endTime: "23:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A22", name: "15:30-00:00", startTime: "15:30", endTime: "00:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A23", name: "16:00-00:30", startTime: "16:00", endTime: "00:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A24", name: "16:30-01:00", startTime: "16:30", endTime: "01:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A25", name: "17:00-01:30", startTime: "17:00", endTime: "01:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A26", name: "17:30-02:00", startTime: "17:30", endTime: "02:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A27", name: "9:00-19:00", startTime: "09:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "19:00", isSplit: true },
  { code: "A3", name: "13:00-20:30", startTime: "13:00", endTime: "20:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A4", name: "13:30-21:00", startTime: "13:30", endTime: "21:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A5", name: "14:00-21:30", startTime: "14:00", endTime: "21:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A6", name: "14:30-22:00", startTime: "14:30", endTime: "22:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A7", name: "15:00-22:30", startTime: "15:00", endTime: "22:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A8", name: "15:30-23:00", startTime: "15:30", endTime: "23:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "A9", name: "16:00-23:30", startTime: "16:00", endTime: "23:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "AD", name: "08:30-17:30", startTime: "08:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "17:30", isSplit: true },
  { code: "AD1", name: "AD1", startTime: "08:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "17:00", isSplit: true },
  { code: "AD8", name: "08:00- 17:00", startTime: "08:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "17:00", isSplit: true },
  { code: "AD9", name: "08:00- 18:00", startTime: "08:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "18:00", isSplit: true },
  { code: "DC1", name: "04:30-13:00", startTime: "04:30", endTime: "13:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "DC10", name: "13:30-22:00", startTime: "13:30", endTime: "22:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "DC11", name: "22:00-6:00", startTime: "22:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "06:00", isSplit: true },
  { code: "DC12", name: "05:00-15:30", startTime: "05:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "15:30", isSplit: true },
  { code: "DC13", name: "05:30-16:00", startTime: "05:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "16:00", isSplit: true },
  { code: "DC14", name: "06:00-16:30", startTime: "06:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "16:30", isSplit: true },
  { code: "DC15", name: "06:30-17:00", startTime: "06:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "17:00", isSplit: true },
  { code: "DC16", name: "07:00-17:30", startTime: "07:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "17:30", isSplit: true },
  { code: "DC17", name: "07:30-18:00", startTime: "07:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "18:00", isSplit: true },
  { code: "DC18", name: "08:00-18:30", startTime: "08:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "18:30", isSplit: true },
  { code: "DC19", name: "18:00-6:00", startTime: "18:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "06:00", isSplit: true },
  { code: "DC2", name: "05:00-13:30", startTime: "05:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "13:30", isSplit: true },
  { code: "DC3", name: "05:30-14:00", startTime: "05:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "14:00", isSplit: true },
  { code: "DC4", name: "06:00-14:30", startTime: "06:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "14:30", isSplit: true },
  { code: "DC5", name: "06:30-15:00", startTime: "06:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "15:00", isSplit: true },
  { code: "DC6", name: "07:00-15:30", startTime: "07:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "15:30", isSplit: true },
  { code: "DC7", name: "07:30-16:00", startTime: "07:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "16:00", isSplit: true },
  { code: "DC8", name: "08:00-16:30", startTime: "08:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "16:30", isSplit: true },
  { code: "DC9", name: "09:00-17:30", startTime: "09:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "17:30", isSplit: true },
  { code: "HAD", name: "08:30-12:30", startTime: "08:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "12:30", isSplit: true },
  { code: "HAD1", name: "13:30-17:30", startTime: "13:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "17:30", isSplit: true },
  { code: "HAD81", name: "8:00- 12:00", startTime: "08:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "12:00", isSplit: true },
  { code: "HAD82", name: "13:00- 17:00", startTime: "13:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "17:00", isSplit: true },
  { code: "HAD91", name: "08:00- 12:30", startTime: "08:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "12:30", isSplit: true },
  { code: "HAD92", name: "13:30- 18:00", startTime: "13:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "18:00", isSplit: true },
  { code: "HNP", name: "Nghỉ không lương nửa ngày (nửa ngày còn lại đi làm)", startTime: "", endTime: "", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "HR", name: "Nghỉ tuần nửa ngày (nửa ngày còn lại đi làm)", startTime: "", endTime: "", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M1", name: "07:30-15:00", startTime: "07:30", endTime: "15:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M10", name: "07:30-16:00", startTime: "07:30", endTime: "16:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M11", name: "08:00-16:30", startTime: "08:00", endTime: "16:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M12", name: "08:30-17:00", startTime: "08:30", endTime: "17:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M13", name: "09:00-17:30", startTime: "09:00", endTime: "17:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M14", name: "09:30-18:00", startTime: "09:30", endTime: "18:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M15", name: "10:00-18:30", startTime: "10:00", endTime: "18:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M16", name: "10:30-19:00", startTime: "10:30", endTime: "19:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M17", name: "11:00-19:30", startTime: "11:00", endTime: "19:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M18", name: "11:30-20:00", startTime: "11:30", endTime: "20:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M2", name: "08:00-15:30", startTime: "08:00", endTime: "15:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M3", name: "08:30-16:00", startTime: "08:30", endTime: "16:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M4", name: "09:00-16:30", startTime: "09:00", endTime: "16:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M5", name: "09:30-17:00", startTime: "09:30", endTime: "17:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M6", name: "10:00-17:30", startTime: "10:00", endTime: "17:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M7", name: "10:30-18:00", startTime: "10:30", endTime: "18:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M8", name: "11:00-18:30", startTime: "11:00", endTime: "18:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "M9", name: "11:30-19:00", startTime: "11:30", endTime: "19:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA1", name: "07:30-20:00", startTime: "07:30", endTime: "20:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA10", name: "12:00-00:30", startTime: "12:00", endTime: "00:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA11", name: "12:30-01:00", startTime: "12:30", endTime: "01:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA12", name: "13:00-01:30", startTime: "13:00", endTime: "01:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA13", name: "13:30-02:00", startTime: "13:30", endTime: "02:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA14", name: "MA1408_30", startTime: "08:00", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "23:00", isSplit: true },
  { code: "MA2", name: "08:00-20:30", startTime: "08:00", endTime: "20:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA3", name: "08:30-21:00", startTime: "08:30", endTime: "21:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA4", name: "09:00-21:30", startTime: "09:00", endTime: "21:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA5", name: "09:30-22:00", startTime: "09:30", endTime: "22:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA6", name: "10:00-22:30", startTime: "10:00", endTime: "22:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA7", name: "10:30-23:00", startTime: "10:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "sky", startTime2: "00:00", endTime2: "23:00", isSplit: true },
  { code: "MA8", name: "11:00-23:30", startTime: "11:00", endTime: "23:30", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "MA9", name: "11:30-00:00", startTime: "11:30", endTime: "00:00", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false },
  { code: "NPL", name: "Nghỉ không lương", startTime: "", endTime: "", breakMinutes: 0, type: "leave", color: "rose", startTime2: null, endTime2: null, isSplit: false },
  { code: "P1", name: "07:30-12:00", startTime: "07:30", endTime: "12:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P10", name: "12:00-16:30", startTime: "12:00", endTime: "16:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P11", name: "12:30-17:00", startTime: "12:30", endTime: "17:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P12", name: "13:00-17:30", startTime: "13:00", endTime: "17:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P13", name: "13:30-18:00", startTime: "13:30", endTime: "18:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P14", name: "14:00-18:30", startTime: "14:00", endTime: "18:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P15", name: "14:30-19:00", startTime: "14:30", endTime: "19:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P16", name: "15:00-19:30", startTime: "15:00", endTime: "19:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P17", name: "15:30-20:00", startTime: "15:30", endTime: "20:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P18", name: "16:00-20:30", startTime: "16:00", endTime: "20:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P19", name: "16:30-21:00", startTime: "16:30", endTime: "21:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P2", name: "08:00-12:30", startTime: "08:00", endTime: "12:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P20", name: "17:00-21:30", startTime: "17:00", endTime: "21:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P21", name: "17:30-22:00", startTime: "17:30", endTime: "22:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P22", name: "18:00-22:30", startTime: "18:00", endTime: "22:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P23", name: "18:30-23:00", startTime: "18:30", endTime: "23:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P24", name: "19:00-23:30", startTime: "19:00", endTime: "23:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P25", name: "19:30-00:00", startTime: "19:30", endTime: "00:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P26", name: "07:30-13:00", startTime: "07:30", endTime: "13:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P27", name: "08:00-13:30", startTime: "08:00", endTime: "13:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P28", name: "08:30-14:00", startTime: "08:30", endTime: "14:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P29", name: "09:00-14:30", startTime: "09:00", endTime: "14:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P3", name: "08:30-13:00", startTime: "08:30", endTime: "13:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P30", name: "09:30-15:00", startTime: "09:30", endTime: "15:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P31", name: "10:00-15:30", startTime: "10:00", endTime: "15:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P32", name: "10:30-16:00", startTime: "10:30", endTime: "16:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P33", name: "11:00-16:30", startTime: "11:00", endTime: "16:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P34", name: "11:30-17:00", startTime: "11:30", endTime: "17:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P35", name: "12:00-17:30", startTime: "12:00", endTime: "17:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P36", name: "12:30-18:00", startTime: "12:30", endTime: "18:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P37", name: "13:00-18:30", startTime: "13:00", endTime: "18:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P38", name: "13:30-19:00", startTime: "13:30", endTime: "19:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P39", name: "14:00-19:30", startTime: "14:00", endTime: "19:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P4", name: "09:00-13:30", startTime: "09:00", endTime: "13:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P40", name: "14:30-20:00", startTime: "14:30", endTime: "20:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P41", name: "15:00-20:30", startTime: "15:00", endTime: "20:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P42", name: "15:30-21:00", startTime: "15:30", endTime: "21:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P43", name: "16:00-21:30", startTime: "16:00", endTime: "21:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P44", name: "16:30-22:00", startTime: "16:30", endTime: "22:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P45", name: "17:00-22:30", startTime: "17:00", endTime: "22:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P46", name: "17:30-23:00", startTime: "17:30", endTime: "23:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P47", name: "18:00-23:30", startTime: "18:00", endTime: "23:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P48", name: "18:30-00:00", startTime: "18:30", endTime: "00:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P49", name: "19:00-00:30", startTime: "19:00", endTime: "00:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P5", name: "09:30-14:00", startTime: "09:30", endTime: "14:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P50", name: "19:30-01:00", startTime: "19:30", endTime: "01:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P51", name: "07:30-14:00", startTime: "07:30", endTime: "14:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P52", name: "08:00-14:30", startTime: "08:00", endTime: "14:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P53", name: "08:30-15:00", startTime: "08:30", endTime: "15:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P54", name: "09:00-15:30", startTime: "09:00", endTime: "15:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P55", name: "09:30-16:00", startTime: "09:30", endTime: "16:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P56", name: "10:00-16:30", startTime: "10:00", endTime: "16:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P57", name: "10:30-17:00", startTime: "10:30", endTime: "17:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P58", name: "11:00-17:30", startTime: "11:00", endTime: "17:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P59", name: "11:30-18:00", startTime: "11:30", endTime: "18:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P6", name: "10:00-14:30", startTime: "10:00", endTime: "14:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P60", name: "12:00-18:30", startTime: "12:00", endTime: "18:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P61", name: "12:30-19:00", startTime: "12:30", endTime: "19:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P62", name: "13:00-19:30", startTime: "13:00", endTime: "19:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P63", name: "13:30-20:00", startTime: "13:30", endTime: "20:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P64", name: "14:00-20:30", startTime: "14:00", endTime: "20:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P65", name: "14:30-21:00", startTime: "14:30", endTime: "21:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P66", name: "15:00-21:30", startTime: "15:00", endTime: "21:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P67", name: "15:30-22:00", startTime: "15:30", endTime: "22:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P68", name: "16:00-22:30", startTime: "16:00", endTime: "22:30", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P69", name: "16:30-23:00", startTime: "16:30", endTime: "23:00", breakMinutes: 0, type: "work", color: "indigo", startTime2: null, endTime2: null, isSplit: false },
  { code: "P7", name: "10:30-15:00", startTime: "10:30", endTime: "15:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P70", name: "17:00-23:30", startTime: "17:00", endTime: "23:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P71", name: "17:30-00:00", startTime: "17:30", endTime: "00:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P72", name: "18:00-00:30", startTime: "18:00", endTime: "00:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P73", name: "18:30-01:00", startTime: "18:30", endTime: "01:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P74", name: "19:00-01:30", startTime: "19:00", endTime: "01:30", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P75", name: "19:30-02:00", startTime: "19:30", endTime: "02:00", breakMinutes: 0, type: "work", color: "amber", startTime2: null, endTime2: null, isSplit: false },
  { code: "P76", name: "18:30-22:30", startTime: "18:30", endTime: "00:00", breakMinutes: 30, type: "work", color: "amber", startTime2: "00:00", endTime2: "22:30", isSplit: true },
  { code: "P8", name: "11:00-15:30", startTime: "11:00", endTime: "15:30", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "P9", name: "11:30-16:00", startTime: "11:30", endTime: "16:00", breakMinutes: 0, type: "work", color: "emerald", startTime2: null, endTime2: null, isSplit: false },
  { code: "R", name: "Nghỉ tuần", startTime: "", endTime: "", breakMinutes: 0, type: "off", color: "gray", startTime2: null, endTime2: null, isSplit: false },
  { code: "S1", name: "07:30-20:30", startTime: "07:30", endTime: "12:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "16:00", endTime2: "20:30", isSplit: true },
  { code: "S10", name: "08:30-21:30", startTime: "08:30", endTime: "13:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "21:30", isSplit: true },
  { code: "S11", name: "08:30-21:30", startTime: "08:30", endTime: "12:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "16:30", endTime2: "21:30", isSplit: true },
  { code: "S12", name: "08:30-22:00", startTime: "08:30", endTime: "14:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "18:30", endTime2: "22:00", isSplit: true },
  { code: "S13", name: "09:00-22:00", startTime: "09:00", endTime: "13:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "22:00", isSplit: true },
  { code: "S14", name: "09:00-21:30", startTime: "09:00", endTime: "13:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "21:30", isSplit: true },
  { code: "S15", name: "09:00-21:00", startTime: "09:00", endTime: "14:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "21:00", isSplit: true },
  { code: "S16", name: "09:00-22:00", startTime: "09:00", endTime: "14:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "18:00", endTime2: "22:00", isSplit: true },
  { code: "S17", name: "09:15-21:30", startTime: "09:15", endTime: "13:45", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "21:30", isSplit: true },
  { code: "S18", name: "09:30-21:30", startTime: "09:30", endTime: "14:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "21:30", isSplit: true },
  { code: "S19", name: "09:30-22:30", startTime: "09:30", endTime: "13:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:30", endTime2: "22:30", isSplit: true },
  { code: "S2", name: "07:30-21:00", startTime: "07:30", endTime: "13:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "18:00", endTime2: "21:00", isSplit: true },
  { code: "S20", name: "09:30-22:00", startTime: "09:30", endTime: "14:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:30", endTime2: "22:00", isSplit: true },
  { code: "S21", name: "09:30-22:30", startTime: "09:30", endTime: "14:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "18:30", endTime2: "22:30", isSplit: true },
  { code: "S22", name: "09:30-21:30", startTime: "09:30", endTime: "14:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "21:30", isSplit: true },
  { code: "S23", name: "09:45-22:00", startTime: "09:45", endTime: "13:45", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "22:00", isSplit: true },
  { code: "S24", name: "10:00-22:00", startTime: "10:00", endTime: "14:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "22:00", isSplit: true },
  { code: "S25", name: "10:00-22:30", startTime: "10:00", endTime: "14:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "18:00", endTime2: "22:30", isSplit: true },
  { code: "S26", name: "10:00-23:00", startTime: "10:00", endTime: "14:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "18:00", endTime2: "23:00", isSplit: true },
  { code: "S27", name: "10:00-23:00", startTime: "10:00", endTime: "15:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "19:00", endTime2: "23:00", isSplit: true },
  { code: "S28", name: "10:30-22:00", startTime: "10:30", endTime: "14:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "22:00", isSplit: true },
  { code: "S29", name: "10:30-23:30", startTime: "10:30", endTime: "14:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "18:30", endTime2: "23:30", isSplit: true },
  { code: "S3", name: "07:30-20:30", startTime: "07:30", endTime: "11:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "15:30", endTime2: "20:30", isSplit: true },
  { code: "S30", name: "10:30-23:30", startTime: "10:30", endTime: "15:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "19:30", endTime2: "23:30", isSplit: true },
  { code: "S31", name: "10:30-22:00", startTime: "10:30", endTime: "14:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "22:00", isSplit: true },
  { code: "S32", name: "11:00-00:00", startTime: "11:00", endTime: "15:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "19:30", endTime2: "00:00", isSplit: true },
  { code: "S33", name: "11:00-00:00", startTime: "11:00", endTime: "15:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "19:00", endTime2: "00:00", isSplit: true },
  { code: "S34", name: "11:00-00:00", startTime: "11:00", endTime: "16:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "20:00", endTime2: "00:00", isSplit: true },
  { code: "S35", name: "11:30-10:30", startTime: "11:30", endTime: "16:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "18:30", endTime2: "22:30", isSplit: true },
  { code: "S36", name: "9:00-19:00", startTime: "09:00", endTime: "13:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "13:00", endTime2: "19:00", isSplit: true },
  { code: "S4", name: "07:30-20:30", startTime: "07:30", endTime: "12:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "16:30", endTime2: "20:30", isSplit: true },
  { code: "S5", name: "08:00-20:00", startTime: "08:00", endTime: "13:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "16:00", endTime2: "20:00", isSplit: true },
  { code: "S6", name: "08:00-21:00", startTime: "08:00", endTime: "12:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "16:30", endTime2: "21:00", isSplit: true },
  { code: "S7", name: "08:00-21:00", startTime: "08:00", endTime: "12:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "16:00", endTime2: "21:00", isSplit: true },
  { code: "S8", name: "08:00-20:30", startTime: "08:00", endTime: "13:30", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "20:30", isSplit: true },
  { code: "S9", name: "08:00-21:00", startTime: "08:00", endTime: "13:00", breakMinutes: 30, type: "work", color: "violet", startTime2: "17:00", endTime2: "21:00", isSplit: true },
  { code: "TS", name: "Nghỉ thai sản", startTime: "", endTime: "", breakMinutes: 0, type: "leave", color: "rose", startTime2: null, endTime2: null, isSplit: false },
  { code: "X", name: "Công đi làm", startTime: "", endTime: "", breakMinutes: 0, type: "work", color: "sky", startTime2: null, endTime2: null, isSplit: false }
];

export const mockEmployees: Employee[] = [
  // BAN QUẢN LÝ
  { id: "1054413", name: "Hoàng Đức Hữu", phone: "0824.678.226", role: "manager", level: "RM", scheduleGroup: "BAN QUẢN LÝ", primaryDepartment: "Quản lý", skills: { "Order": true, "Phục vụ": true }, status: "active" },
  { id: "0198393", name: "Nguyễn Văn Hân", phone: "0357.516.001", role: "manager", level: "QLC", scheduleGroup: "BAN QUẢN LÝ", primaryDepartment: "Quản lý", skills: { "Order": true, "Phục vụ": true, "Bar": true }, status: "active" },
  // ORDER + PHỤC VỤ
  { id: "1048964", name: "Lê Hải Anh", phone: "0901.111.001", role: "employee", level: "S1.1", scheduleGroup: "ORDER + PHỤC VỤ", primaryDepartment: "FOH", skills: { "Order": true, "Phục vụ": true }, status: "active" },
  { id: "0198394", name: "Nguyễn Thị Hương", phone: "0901.111.002", role: "employee", level: "S1.2", scheduleGroup: "ORDER + PHỤC VỤ", primaryDepartment: "FOH", skills: { "Order": true, "Phục vụ": true }, status: "active" },
  { id: "E100001", name: "Khánh Hà", phone: "0901.111.003", role: "employee", level: "NEW", scheduleGroup: "ORDER + PHỤC VỤ", primaryDepartment: "FOH", skills: { "Phục vụ": true }, status: "active" },
  { id: "E100002", name: "Hồng Bích", phone: "0901.111.004", role: "employee", level: "HUB", scheduleGroup: "ORDER + PHỤC VỤ", primaryDepartment: "FOH", skills: { "Phục vụ": true }, status: "active" },
  { id: "E100003", name: "Uyên", phone: "0901.111.005", role: "employee", level: "HUB", scheduleGroup: "ORDER + PHỤC VỤ", primaryDepartment: "FOH", skills: { "Phục vụ": true, "Order": true }, status: "active" },
  { id: "E100004", name: "Trang", phone: "0901.111.006", role: "employee", level: "HUB", scheduleGroup: "ORDER + PHỤC VỤ", primaryDepartment: "FOH", skills: { "Phục vụ": true }, status: "active" },
  { id: "E100005", name: "Như Ý", phone: "0901.111.007", role: "employee", level: "HUB", scheduleGroup: "ORDER + PHỤC VỤ", primaryDepartment: "FOH", skills: { "Phục vụ": true }, status: "active" },
  // BOY
  { id: "1072840", name: "Nguyễn Trung Kiên", phone: "0901.222.001", role: "employee", level: "S2.1", scheduleGroup: "BOY", primaryDepartment: "FOH", skills: { "Boy": true }, status: "active" },
  { id: "E200001", name: "Hoàng Mạnh Tùng", phone: "0901.222.002", role: "employee", level: "S2.2", scheduleGroup: "BOY", primaryDepartment: "FOH", skills: { "Boy": true, "Phục vụ": true }, status: "active" },
  { id: "E200002", name: "Nguyễn Chu Nhật Tiến", phone: "0901.222.003", role: "employee", level: "S2.3", scheduleGroup: "BOY", primaryDepartment: "FOH", skills: { "Boy": true }, status: "active" },
  { id: "E200003", name: "Anh Tuấn", phone: "0901.222.004", role: "employee", level: "S1.3", scheduleGroup: "BOY", primaryDepartment: "FOH", skills: { "Boy": true }, status: "active" },
  // BOH (BẾP)
  { id: "1060819", name: "Nguyễn Khánh Hưng", phone: "0901.333.001", role: "employee", level: "S3.1", scheduleGroup: "BOH (BẾP)", primaryDepartment: "BOH", skills: { "Bếp nóng": true, "Bếp thịt": true }, status: "active" },
  { id: "1044771", name: "Phạm Thủy Quỳnh", phone: "0901.333.002", role: "employee", level: "S3.2", scheduleGroup: "BOH (BẾP)", primaryDepartment: "BOH", skills: { "Bếp salad": true }, status: "active" },
  { id: "1070637", name: "Tô Ngọc Ánh", phone: "0901.333.003", role: "employee", level: "S3.3", scheduleGroup: "BOH (BẾP)", primaryDepartment: "BOH", skills: { "Bếp nóng": true, "Bếp thịt": true }, status: "active" },
  { id: "1073283", name: "Lê Hà Quỳnh Nhi", phone: "0901.333.004", role: "employee", level: "S1.1", scheduleGroup: "BOH (BẾP)", primaryDepartment: "BOH", skills: { "Bếp salad": true, "Bếp nóng": true }, status: "active" },
  { id: "E300001", name: "Phạm Thị Kim Cúc", phone: "0901.333.005", role: "employee", level: "S1.2", scheduleGroup: "BOH (BẾP)", primaryDepartment: "BOH", skills: { "Bếp thịt": true }, status: "active" },
  // TẠP VỤ
  { id: "1073589", name: "Nguyễn Thị Lý", phone: "0901.444.001", role: "employee", level: "HUB", scheduleGroup: "TẠP VỤ", primaryDepartment: "Tạp vụ", skills: { "Tạp vụ": true }, status: "active" },
  // BAR
  { id: "1060418", name: "Trường Thị Như Yến", phone: "0901.555.001", role: "employee", level: "S1.1", scheduleGroup: "BAR", primaryDepartment: "Bar", skills: { "Bar": true }, status: "active" },
  { id: "1074957", name: "Hoàng Thị Thanh Hà", phone: "0901.555.002", role: "employee", level: "S1.2", scheduleGroup: "BAR", primaryDepartment: "Bar", skills: { "Bar": true }, status: "active" },
];

// Helper: build assignment shorthand
const a = (eid: string, sc: string, role: string): ShiftAssignment => ({
  employeeId: eid, shiftCode: sc, primaryRole: role,
});

export const mockSchedules: WeeklySchedule[] = [
  {
    weekId: "2026-W25",
    startDate: "2026-06-15",
    endDate: "2026-06-21",
    status: "published",
    assignments: {
      "Thứ 2": [
        a("1054413","KF1","Quản lý"), a("0198393","A20","Quản lý"),
        a("1048964","NPL","Phục vụ"), a("0198394","P22","Phục vụ"), a("E100001","P45","Phục vụ"), a("E100002","P30","Phục vụ"), a("E100003","NPL","Phục vụ"), a("E100004","P22","Phục vụ"), a("E100005","P30","Phục vụ"),
        a("1072840","P45","Boy"), a("E200001","P30","Boy"), a("E200002","P30","Boy"), a("E200003","NPL","Boy"),
        a("1060819","P45","Bếp nóng"), a("1044771","NPL","Bếp salad"), a("1070637","P22","Bếp nóng"), a("1073283","P29","Bếp salad"), a("E300001","NPL","Bếp thịt"),
        a("1073589","MA6","Tạp vụ"),
        a("1060418","NPL","Bar"), a("1074957","P22","Bar"),
      ],
      "Thứ 3": [
        a("1054413","KF3","Quản lý"), a("0198393","S20","Quản lý"),
        a("1048964","NPL","Phục vụ"), a("0198394","P22","Phục vụ"), a("E100001","P22","Phục vụ"), a("E100002","NPL","Phục vụ"), a("E100003","P45","Phục vụ"), a("E100004","S20","Phục vụ"), a("E100005","NPL","Phục vụ"),
        a("1072840","S20","Boy"), a("E200001","NPL","Boy"), a("E200002","P30","Boy"), a("E200003","NPL","Boy"),
        a("1060819","P45","Bếp nóng"), a("1044771","P22","Bếp salad"), a("1070637","NPL","Bếp nóng"), a("1073283","NPL","Bếp salad"), a("E300001","P29","Bếp thịt"),
        a("1073589","MA6","Tạp vụ"),
        a("1060418","P22","Bar"), a("1074957","NPL","Bar"),
      ],
      "Thứ 4": [
        a("1054413","KF3","Quản lý"), a("0198393","S20","Quản lý"),
        a("1048964","P22","Phục vụ"), a("0198394","P22","Phục vụ"), a("E100001","P30","Phục vụ"), a("E100002","NPL","Phục vụ"), a("E100003","P30","Phục vụ"), a("E100004","NPL","Phục vụ"), a("E100005","NPL","Phục vụ"),
        a("1072840","NPL","Boy"), a("E200001","NPL","Boy"), a("E200002","P45","Boy"), a("E200003","NPL","Boy"),
        a("1060819","P30","Bếp nóng"), a("1044771","P22","Bếp salad"), a("1070637","NPL","Bếp nóng"), a("1073283","P29","Bếp salad"), a("E300001","NPL","Bếp thịt"),
        a("1073589","MA6","Tạp vụ"),
        a("1060418","NPL","Bar"), a("1074957","P22","Bar"),
      ],
      "Thứ 5": [
        a("1054413","KF3","Quản lý"), a("0198393","S20","Quản lý"),
        a("1048964","P22","Phục vụ"), a("0198394","P45","Phục vụ"), a("E100001","P30","Phục vụ"), a("E100002","P45","Phục vụ"), a("E100003","P45","Phục vụ"), a("E100004","NPL","Phục vụ"), a("E100005","S20","Phục vụ"),
        a("1072840","NPL","Boy"), a("E200001","P45","Boy"), a("E200002","P30","Boy"), a("E200003","NPL","Boy"),
        a("1060819","P45","Bếp nóng"), a("1044771","P22","Bếp salad"), a("1070637","P29","Bếp nóng"), a("1073283","NPL","Bếp salad"), a("E300001","NPL","Bếp thịt"),
        a("1073589","MA6","Tạp vụ"),
        a("1060418","NPL","Bar"), a("1074957","P22","Bar"),
      ],
      "Thứ 6": [
        a("1054413","NPL","Quản lý"), a("0198393","S20","Quản lý"),
        a("1048964","P22","Phục vụ"), a("0198394","P22","Phục vụ"), a("E100001","P22","Phục vụ"), a("E100002","S20","Phục vụ"), a("E100003","P45","Phục vụ"), a("E100004","P30","Phục vụ"), a("E100005","S20","Phục vụ"),
        a("1072840","P45","Boy"), a("E200001","S20","Boy"), a("E200002","NPL","Boy"), a("E200003","NPL","Boy"),
        a("1060819","P45","Bếp nóng"), a("1044771","P22","Bếp salad"), a("1070637","P22","Bếp nóng"), a("1073283","P22","Bếp salad"), a("E300001","P45","Bếp thịt"),
        a("1073589","MA6","Tạp vụ"),
        a("1060418","P22","Bar"), a("1074957","P22","Bar"),
      ],
      "Thứ 7": [
        a("1054413","NPL","Quản lý"), a("0198393","S20","Quản lý"),
        a("1048964","P22","Phục vụ"), a("0198394","P22","Phục vụ"), a("E100001","P22","Phục vụ"), a("E100002","P30","Phục vụ"), a("E100003","NPL","Phục vụ"), a("E100004","P22","Phục vụ"), a("E100005","NPL","Phục vụ"),
        a("1072840","S20","Boy"), a("E200001","P45","Boy"), a("E200002","NPL","Boy"), a("E200003","NPL","Boy"),
        a("1060819","P45","Bếp nóng"), a("1044771","P22","Bếp salad"), a("1070637","P29","Bếp nóng"), a("1073283","P22","Bếp salad"), a("E300001","P45","Bếp thịt"),
        a("1073589","MA6","Tạp vụ"),
        a("1060418","P22","Bar"), a("1074957","P45","Bar"),
      ],
      "Chủ Nhật": [
        a("1054413","NPL","Quản lý"), a("0198393","S20","Quản lý"),
        a("1048964","NPL","Phục vụ"), a("0198394","P22","Phục vụ"), a("E100001","P22","Phục vụ"), a("E100002","NPL","Phục vụ"), a("E100003","P45","Phục vụ"), a("E100004","NPL","Phục vụ"), a("E100005","S20","Phục vụ"),
        a("1072840","P45","Boy"), a("E200001","S20","Boy"), a("E200002","NPL","Boy"), a("E200003","NPL","Boy"),
        a("1060819","P45","Bếp nóng"), a("1044771","P22","Bếp salad"), a("1070637","NPL","Bếp nóng"), a("1073283","P22","Bếp salad"), a("E300001","NPL","Bếp thịt"),
        a("1073589","MA6","Tạp vụ"),
        a("1060418","P22","Bar"), a("1074957","P22","Bar"),
      ],
    },
    preferences: [],
    forecast: {
      "Thứ 2": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 3": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 4": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 5": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 6": { "FOH": 4, "BOH": 3, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 7": { "FOH": 4, "BOH": 3, "Bar": 1, "Tạp vụ": 1 },
      "Chủ Nhật": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
    },
  },
  {
    weekId: "2026-W26",
    startDate: "2026-06-22",
    endDate: "2026-06-28",
    status: "registration_open",
    assignments: {
      "Thứ 2": [], "Thứ 3": [], "Thứ 4": [], "Thứ 5": [],
      "Thứ 6": [], "Thứ 7": [], "Chủ Nhật": [],
    },
    preferences: [
      {
        employeeId: "1048964",
        dayPreferences: {
          "Thứ 2": { type: "preferred", preferredShift: "P22" },
          "Thứ 3": { type: "available" },
          "Thứ 4": { type: "unavailable", note: "Có việc gia đình" },
          "Thứ 5": { type: "available" },
          "Thứ 6": { type: "preferred", preferredShift: "P22" },
          "Thứ 7": { type: "available" },
          "Chủ Nhật": { type: "unavailable", note: "Nghỉ cuối tuần" },
        },
      },
      {
        employeeId: "1074957",
        dayPreferences: {
          "Thứ 2": { type: "available" },
          "Thứ 3": { type: "available" },
          "Thứ 4": { type: "available" },
          "Thứ 5": { type: "preferred", preferredShift: "P22" },
          "Thứ 6": { type: "available" },
          "Thứ 7": { type: "preferred", preferredShift: "P45" },
          "Chủ Nhật": { type: "available" },
        },
      },
    ],
    forecast: {
      "Thứ 2": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 3": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 4": { "FOH": 4, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 5": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 6": { "FOH": 4, "BOH": 3, "Bar": 1, "Tạp vụ": 1 },
      "Thứ 7": { "FOH": 4, "BOH": 3, "Bar": 1, "Tạp vụ": 1 },
      "Chủ Nhật": { "FOH": 3, "BOH": 2, "Bar": 1, "Tạp vụ": 1 },
    },
  },
];
