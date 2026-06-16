import { create } from 'zustand';
import type { 
  Employee, 
  ShiftCode, 
  WeeklySchedule, 
  ShiftAssignment,
  EmployeePreference
} from '../data/mockData';
import { mockSchedules } from '../data/mockData';
import {
  authApi,
  employeeApi,
  getApiErrorMessage,
  shiftApi,
} from '../lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ScheduleStore {
  employees: Employee[];
  shiftCodes: ShiftCode[];
  schedules: WeeklySchedule[];
  currentWeekId: string;
  currentUser: Employee | null;
  authStatus: AuthStatus;
  authError: string | null;
  catalogStatus: CatalogStatus;
  catalogError: string | null;
  
  // Auth Actions
  initializeAuth: () => Promise<void>;
  loginEmployee: (employeeIdOrPhone: string) => Promise<boolean>;
  loginManager: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadCatalogs: () => Promise<void>;
  setCurrentUser: (user: string | Employee | null) => void;
  
  // Week Actions
  setCurrentWeekId: (weekId: string) => void;
  updateScheduleStatus: (weekId: string, status: WeeklySchedule['status']) => void;
  createNextWeek: () => void;
  
  // Scheduling Actions
  addAssignment: (weekId: string, day: string, assignment: ShiftAssignment) => void;
  removeAssignment: (weekId: string, day: string, employeeId: string) => void;
  updateAssignment: (weekId: string, day: string, employeeId: string, updates: Partial<ShiftAssignment>) => void;
  
  // Preference Actions
  submitPreferences: (weekId: string, employeeId: string, preferences: EmployeePreference['dayPreferences']) => void;
  
  // Forecast Actions
  updateForecast: (weekId: string, forecast: WeeklySchedule['forecast']) => void;
  
  // Admin Settings Actions
  addEmployee: (employee: Employee) => Promise<Employee>;
  updateEmployee: (employee: Employee) => Promise<Employee>;
  updateEmployeeStatus: (id: string, status: Employee['status']) => Promise<Employee>;
  addShiftCode: (shift: ShiftCode) => Promise<ShiftCode>;
  updateShiftCode: (shift: ShiftCode) => Promise<ShiftCode>;
  updateShiftStatus: (
    code: string,
    status: 'active' | 'inactive',
  ) => Promise<ShiftCode>;
}

async function fetchCatalogs(user: Employee): Promise<{
  employees: Employee[];
  shiftCodes: ShiftCode[];
}> {
  const [employees, shiftCodes] = await Promise.all([
    user.role === 'manager' ? employeeApi.list() : Promise.resolve([user]),
    shiftApi.list(),
  ]);
  return { employees, shiftCodes };
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  employees: [],
  shiftCodes: [],
  schedules: mockSchedules,
  currentWeekId: "2026-W25",
  currentUser: null,
  authStatus: 'loading',
  authError: null,
  catalogStatus: 'idle',
  catalogError: null,

  initializeAuth: async () => {
    try {
      const session = await authApi.bootstrap();
      set({
        currentUser: session.profile,
        authStatus: 'authenticated',
        authError: null,
        catalogStatus: 'loading',
        catalogError: null,
      });
      await get().loadCatalogs();
    } catch {
      set({
        currentUser: null,
        employees: [],
        shiftCodes: [],
        authStatus: 'anonymous',
        authError: null,
        catalogStatus: 'idle',
        catalogError: null,
      });
    }
  },

  loginEmployee: async (employeeIdOrPhone) => {
    set({ authError: null });
    try {
      const session = await authApi.loginEmployee(employeeIdOrPhone);
      set({
        currentUser: session.profile,
        authStatus: 'authenticated',
        authError: null,
        catalogStatus: 'loading',
        catalogError: null,
      });
      await get().loadCatalogs();
      return true;
    } catch (error: unknown) {
      set({
        currentUser: null,
        authStatus: 'anonymous',
        authError: getApiErrorMessage(error),
      });
      return false;
    }
  },

  loginManager: async (username, password) => {
    set({ authError: null });
    try {
      const session = await authApi.loginManager(username, password);
      set({
        currentUser: session.profile,
        authStatus: 'authenticated',
        authError: null,
        catalogStatus: 'loading',
        catalogError: null,
      });
      await get().loadCatalogs();
      return true;
    } catch (error: unknown) {
      set({
        currentUser: null,
        authStatus: 'anonymous',
        authError: getApiErrorMessage(error),
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({
        currentUser: null,
        employees: [],
        shiftCodes: [],
        authStatus: 'anonymous',
        authError: null,
        catalogStatus: 'idle',
        catalogError: null,
      });
    }
  },

  loadCatalogs: async () => {
    const user = get().currentUser;
    if (!user) return;
    set({ catalogStatus: 'loading', catalogError: null });
    try {
      const catalogs = await fetchCatalogs(user);
      set({ ...catalogs, catalogStatus: 'ready', catalogError: null });
    } catch (error: unknown) {
      set({
        catalogStatus: 'error',
        catalogError: getApiErrorMessage(error),
      });
    }
  },
  
  setCurrentUser: (userOrId) => set((state) => {
    if (!userOrId) {
      return { currentUser: null, authStatus: 'anonymous' };
    }
    
    const user =
      typeof userOrId === 'string'
        ? state.employees.find(e => e.id === userOrId) || null
        : userOrId;
    
    return {
      currentUser: user,
      authStatus: user ? 'authenticated' : 'anonymous',
    };
  }),
  
  setCurrentWeekId: (weekId) => set({ currentWeekId: weekId }),
  
  updateScheduleStatus: (weekId, status) => set((state) => ({
    schedules: state.schedules.map((s) => 
      s.weekId === weekId ? { ...s, status } : s
    )
  })),

  createNextWeek: () => set((state) => {
    let latestWeek = state.schedules[0];
    for (const s of state.schedules) {
      if (s.weekId > latestWeek.weekId) {
        latestWeek = s;
      }
    }
    
    const lastEnd = new Date(latestWeek.endDate);
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 6);
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const match = latestWeek.weekId.match(/^(\d{4})-W(\d{2})$/);
    let nextWeekId: string;
    if (match) {
      const year = parseInt(match[1], 10);
      const weekNum = parseInt(match[2], 10);
      let nextWeekNum = weekNum + 1;
      let nextYear = year;
      if (nextWeekNum > 52) {
        nextWeekNum = 1;
        nextYear += 1;
      }
      nextWeekId = `${nextYear}-W${String(nextWeekNum).padStart(2, '0')}`;
    } else {
      nextWeekId = `2026-W${state.schedules.length + 25}`;
    }
    
    const nextStartStr = formatDate(nextStart);
    const nextEndStr = formatDate(nextEnd);
    
    const newSchedule: WeeklySchedule = {
      weekId: nextWeekId,
      startDate: nextStartStr,
      endDate: nextEndStr,
      status: 'draft',
      assignments: {
        "Thứ 2": [],
        "Thứ 3": [],
        "Thứ 4": [],
        "Thứ 5": [],
        "Thứ 6": [],
        "Thứ 7": [],
        "Chủ Nhật": []
      },
      preferences: [],
      forecast: {
        "Thứ 2": {},
        "Thứ 3": {},
        "Thứ 4": {},
        "Thứ 5": {},
        "Thứ 6": {},
        "Thứ 7": {},
        "Chủ Nhật": {}
      }
    };
    
    return {
      schedules: [...state.schedules, newSchedule],
      currentWeekId: nextWeekId
    };
  }),
  
  addAssignment: (weekId, day, assignment) => set((state) => ({
    schedules: state.schedules.map((s) => {
      if (s.weekId !== weekId) return s;
      
      const currentDayAssignments = s.assignments[day] || [];
      // Prevent duplicates
      if (currentDayAssignments.some(a => a.employeeId === assignment.employeeId)) {
        return s;
      }
      
      return {
        ...s,
        assignments: {
          ...s.assignments,
          [day]: [...currentDayAssignments, assignment]
        }
      };
    })
  })),
  
  removeAssignment: (weekId, day, employeeId) => set((state) => ({
    schedules: state.schedules.map((s) => {
      if (s.weekId !== weekId) return s;
      
      const currentDayAssignments = s.assignments[day] || [];
      return {
        ...s,
        assignments: {
          ...s.assignments,
          [day]: currentDayAssignments.filter(a => a.employeeId !== employeeId)
        }
      };
    })
  })),
  
  updateAssignment: (weekId, day, employeeId, updates) => set((state) => ({
    schedules: state.schedules.map((s) => {
      if (s.weekId !== weekId) return s;
      
      const currentDayAssignments = s.assignments[day] || [];
      return {
        ...s,
        assignments: {
          ...s.assignments,
          [day]: currentDayAssignments.map((a) => 
            a.employeeId === employeeId ? { ...a, ...updates } : a
          )
        }
      };
    })
  })),
  
  submitPreferences: (weekId, employeeId, dayPreferences) => set((state) => ({
    schedules: state.schedules.map((s) => {
      if (s.weekId !== weekId) return s;
      
      const existingPrefIdx = s.preferences.findIndex(p => p.employeeId === employeeId);
      const updatedPrefs = [...s.preferences];
      
      if (existingPrefIdx >= 0) {
        updatedPrefs[existingPrefIdx] = {
          employeeId,
          dayPreferences
        };
      } else {
        updatedPrefs.push({
          employeeId,
          dayPreferences
        });
      }
      
      return {
        ...s,
        preferences: updatedPrefs
      };
    })
  })),
  
  updateForecast: (weekId, forecast) => set((state) => ({
    schedules: state.schedules.map((s) => 
      s.weekId === weekId ? { ...s, forecast } : s
    )
  })),
  
  addEmployee: async (employee) => {
    try {
      const created = await employeeApi.create(employee);
      set((state) => ({
        employees: [...state.employees, created],
        catalogError: null,
      }));
      return created;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      throw error;
    }
  },
  
  updateEmployee: async (employee) => {
    try {
      const updated = await employeeApi.update(employee);
      set((state) => ({
        employees: state.employees.map((item) =>
          item.id === updated.id ? updated : item,
        ),
        currentUser:
          state.currentUser?.id === updated.id ? updated : state.currentUser,
        catalogError: null,
      }));
      return updated;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      throw error;
    }
  },

  updateEmployeeStatus: async (id, status) => {
    try {
      const updated = await employeeApi.updateStatus(id, status);
      set((state) => ({
        employees: state.employees.map((item) =>
          item.id === updated.id ? updated : item,
        ),
        catalogError: null,
      }));
      return updated;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      throw error;
    }
  },
  
  addShiftCode: async (shift) => {
    try {
      const created = await shiftApi.create(shift);
      set((state) => ({
        shiftCodes: [...state.shiftCodes, created],
        catalogError: null,
      }));
      return created;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      throw error;
    }
  },
  
  updateShiftCode: async (shift) => {
    try {
      const updated = await shiftApi.update(shift);
      set((state) => ({
        shiftCodes: state.shiftCodes.map((item) =>
          item.code === updated.code ? updated : item,
        ),
        catalogError: null,
      }));
      return updated;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      throw error;
    }
  },

  updateShiftStatus: async (code, status) => {
    try {
      const updated = await shiftApi.updateStatus(code, status);
      set((state) => ({
        shiftCodes: state.shiftCodes.map((item) =>
          item.code === updated.code ? updated : item,
        ),
        catalogError: null,
      }));
      return updated;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      throw error;
    }
  },
}));
