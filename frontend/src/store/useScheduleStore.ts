import { create } from 'zustand';
import type { 
  Employee, 
  ShiftCode, 
  WeeklySchedule, 
  ShiftAssignment,
  EmployeePreference
} from '../data/mockData';
import {
  ApiError,
  authApi,
  employeeApi,
  getApiErrorMessage,
  scheduleApi,
  shiftApi,
} from '../lib/api';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

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
  scheduleStatus: CatalogStatus;
  scheduleError: string | null;
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
  
  // Auth Actions
  initializeAuth: () => Promise<void>;
  loginEmployee: (employeeIdOrPhone: string) => Promise<boolean>;
  loginManager: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadCatalogs: () => Promise<void>;
  loadSchedules: () => Promise<void>;
  setCurrentUser: (user: string | Employee | null) => void;
  
  // Week Actions
  setCurrentWeekId: (weekId: string) => void;
  updateScheduleStatus: (
    weekId: string,
    status: WeeklySchedule['status'],
  ) => Promise<WeeklySchedule>;
  createNextWeek: () => Promise<WeeklySchedule>;
  
  // Scheduling Actions
  addAssignment: (
    weekId: string,
    day: string,
    assignment: ShiftAssignment,
  ) => Promise<WeeklySchedule>;
  removeAssignment: (
    weekId: string,
    day: string,
    employeeId: string,
  ) => Promise<WeeklySchedule>;
  updateAssignment: (
    weekId: string,
    day: string,
    employeeId: string,
    updates: Partial<ShiftAssignment>,
  ) => Promise<WeeklySchedule>;
  
  // Preference Actions
  submitPreferences: (
    weekId: string,
    employeeId: string,
    preferences: EmployeePreference['dayPreferences'],
  ) => Promise<WeeklySchedule>;
  
  // Forecast Actions
  updateForecast: (
    weekId: string,
    forecast: WeeklySchedule['forecast'],
  ) => Promise<WeeklySchedule>;
  
  // Admin Settings Actions
  addEmployee: (employee: Employee) => Promise<Employee>;
  updateEmployee: (oldId: string, employee: Employee) => Promise<Employee>;
  updateEmployeeStatus: (id: string, status: Employee['status']) => Promise<Employee>;
  addShiftCode: (shift: ShiftCode) => Promise<ShiftCode>;
  updateShiftCode: (shift: ShiftCode) => Promise<ShiftCode>;
  updateShiftStatus: (
    code: string,
    status: 'active' | 'inactive',
  ) => Promise<ShiftCode>;
}

async function fetchCatalogs(): Promise<{
  employees: Employee[];
  shiftCodes: ShiftCode[];
  schedules: WeeklySchedule[];
}> {
  const [employees, shiftCodes, schedules] = await Promise.all([
    employeeApi.list(),
    shiftApi.list(),
    scheduleApi.list(),
  ]);
  return { employees, shiftCodes, schedules };
}

function replaceSchedule(
  schedules: WeeklySchedule[],
  updated: WeeklySchedule,
): WeeklySchedule[] {
  return schedules.map((schedule) =>
    schedule.weekId === updated.weekId ? updated : schedule,
  );
}

function withoutAssignmentId(assignment: ShiftAssignment): ShiftAssignment {
  return {
    employeeId: assignment.employeeId,
    shiftCode: assignment.shiftCode,
    primaryRole: assignment.primaryRole,
    ...(assignment.secondaryRole ? { secondaryRole: assignment.secondaryRole } : {}),
    ...(assignment.note ? { note: assignment.note } : {}),
  };
}

function assignmentPayload(
  assignments: WeeklySchedule['assignments'],
): WeeklySchedule['assignments'] {
  return Object.fromEntries(
    Object.entries(assignments).map(([day, dayAssignments]) => [
      day,
      dayAssignments.map(withoutAssignmentId),
    ]),
  );
}

function showScheduleMutationWarning(
  showToast: ScheduleStore['showToast'],
  warnings: Array<{ message: string }>,
  successMessage: string,
  successType: Toast['type'] = 'success',
): void {
  if (warnings.length > 0) {
    const cleanSuccess = successMessage.replace(/[!！]$/, '');
    showToast(`${cleanSuccess} nhưng ${warnings[0]?.message.toLowerCase()}`, 'warning');
  } else {
    showToast(successMessage, successType);
  }
}

async function refreshAfterScheduleError(error: unknown, loadSchedules: () => Promise<void>) {
  if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
    await loadSchedules();
  } else {
    void loadSchedules();
  }
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  employees: [],
  shiftCodes: [],
  schedules: [],
  currentWeekId: '',
  currentUser: null,
  authStatus: 'loading',
  authError: null,
  catalogStatus: 'idle',
  catalogError: null,
  scheduleStatus: 'idle',
  scheduleError: null,
  toasts: [],
  showToast: (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 4000);
  },
  dismissToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  initializeAuth: async () => {
    try {
      const session = await authApi.bootstrap();
      set({
        currentUser: session.profile,
        authStatus: 'authenticated',
        authError: null,
        catalogStatus: 'loading',
        catalogError: null,
        scheduleStatus: 'loading',
        scheduleError: null,
      });
      await get().loadCatalogs();
    } catch {
      set({
        currentUser: null,
        employees: [],
        shiftCodes: [],
        schedules: [],
        currentWeekId: '',
        authStatus: 'anonymous',
        authError: null,
        catalogStatus: 'idle',
        catalogError: null,
        scheduleStatus: 'idle',
        scheduleError: null,
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
        scheduleStatus: 'loading',
        scheduleError: null,
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
        scheduleStatus: 'loading',
        scheduleError: null,
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
        schedules: [],
        currentWeekId: '',
        authStatus: 'anonymous',
        authError: null,
        catalogStatus: 'idle',
        catalogError: null,
        scheduleStatus: 'idle',
        scheduleError: null,
      });
    }
  },

  loadCatalogs: async () => {
    const user = get().currentUser;
    if (!user) return;
    set({ catalogStatus: 'loading', catalogError: null, scheduleStatus: 'loading', scheduleError: null });
    try {
      const catalogs = await fetchCatalogs();
      const currentWeekId = get().currentWeekId;
      const nextWeekId =
        catalogs.schedules.find((schedule) => schedule.weekId === currentWeekId)?.weekId ??
        catalogs.schedules[0]?.weekId ??
        '';
      set({
        ...catalogs,
        currentWeekId: nextWeekId,
        catalogStatus: 'ready',
        catalogError: null,
        scheduleStatus: 'ready',
        scheduleError: null,
      });
    } catch (error: unknown) {
      set({
        catalogStatus: 'error',
        catalogError: getApiErrorMessage(error),
        scheduleStatus: 'error',
        scheduleError: getApiErrorMessage(error),
      });
    }
  },

  loadSchedules: async () => {
    const user = get().currentUser;
    if (!user) return;
    set({ scheduleStatus: 'loading', scheduleError: null });
    try {
      const schedules = await scheduleApi.list();
      const currentWeekId = get().currentWeekId;
      const nextWeekId =
        schedules.find((schedule) => schedule.weekId === currentWeekId)?.weekId ??
        schedules[0]?.weekId ??
        '';
      set({
        schedules,
        currentWeekId: nextWeekId,
        scheduleStatus: 'ready',
        scheduleError: null,
      });
    } catch (error: unknown) {
      set({ scheduleStatus: 'error', scheduleError: getApiErrorMessage(error) });
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
  
  updateScheduleStatus: async (weekId, status) => {
    const current = get().schedules.find((schedule) => schedule.weekId === weekId);
    if (!current) {
      get().showToast('Không tìm thấy tuần lịch cần cập nhật!', 'error');
      throw new Error('Schedule not found');
    }

    try {
      const updated = await scheduleApi.updateStatus(weekId, status, current.version ?? 0);
      set((state) => ({
        schedules: state.schedules.map((schedule) =>
          schedule.weekId === updated.weekId ? updated : schedule,
        ),
        scheduleError: null,
      }));
      get().showToast('Đã cập nhật trạng thái tuần!', 'success');
      return updated;
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      set({ scheduleError: message });
      get().showToast(message, 'error');
      void get().loadSchedules();
      throw error;
    }
  },

  createNextWeek: async () => {
    try {
      const created = await scheduleApi.createNext();
      set((state) => ({
        schedules: [created, ...state.schedules.filter((item) => item.weekId !== created.weekId)],
        currentWeekId: created.weekId,
        scheduleError: null,
      }));
      get().showToast(`Đã khởi tạo tuần mới ${created.weekId} thành công!`, 'success');
      return created;
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      set({ scheduleError: message });
      get().showToast(message, 'error');
      throw error;
    }
  },
  
  addAssignment: async (weekId, day, assignment) => {
    const current = get().schedules.find((item) => item.weekId === weekId);
    if (!current) {
      get().showToast('Không tìm thấy tuần lịch cần xếp ca!', 'error');
      throw new Error('Schedule not found');
    }

    const existing = current.assignments[day]?.find(
      (item) => item.employeeId === assignment.employeeId,
    );

    try {
      const result = existing?.assignmentId
        ? await scheduleApi.updateAssignment(
            weekId,
            existing.assignmentId,
            current.version ?? 0,
            { ...assignment, day },
          )
        : existing
          ? await scheduleApi.replaceAssignments(weekId, current.version ?? 0, {
              ...assignmentPayload(current.assignments),
              [day]: (current.assignments[day] ?? []).map((item) =>
                item.employeeId === assignment.employeeId
                  ? withoutAssignmentId({ ...item, ...assignment })
                  : withoutAssignmentId(item),
              ),
            })
          : await scheduleApi.createAssignment(weekId, current.version ?? 0, day, assignment);

      set((state) => ({
        schedules: replaceSchedule(state.schedules, result.schedule),
        scheduleError: null,
      }));
      showScheduleMutationWarning(
        get().showToast,
        result.warnings,
        existing ? 'Đã cập nhật ca làm việc!' : 'Đã xếp ca thành công!',
        'success',
      );
      return result.schedule;
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      set({ scheduleError: message });
      get().showToast(message, 'error');
      await refreshAfterScheduleError(error, get().loadSchedules);
      throw error;
    }
  },
  
  removeAssignment: async (weekId, day, employeeId) => {
    const current = get().schedules.find((item) => item.weekId === weekId);
    if (!current) {
      get().showToast('Không tìm thấy tuần lịch cần xóa ca!', 'error');
      throw new Error('Schedule not found');
    }

    const existing = current.assignments[day]?.find((item) => item.employeeId === employeeId);
    if (!existing) return current;

    try {
      const result = existing.assignmentId
        ? await scheduleApi.deleteAssignment(weekId, existing.assignmentId, current.version ?? 0)
        : await scheduleApi.replaceAssignments(weekId, current.version ?? 0, {
            ...assignmentPayload(current.assignments),
            [day]: (current.assignments[day] ?? [])
              .filter((item) => item.employeeId !== employeeId)
              .map(withoutAssignmentId),
          });

      set((state) => ({
        schedules: replaceSchedule(state.schedules, result.schedule),
        scheduleError: null,
      }));
      showScheduleMutationWarning(get().showToast, result.warnings, 'Đã xóa ca làm việc!', 'info');
      return result.schedule;
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      set({ scheduleError: message });
      get().showToast(message, 'error');
      await refreshAfterScheduleError(error, get().loadSchedules);
      throw error;
    }
  },
  
  updateAssignment: async (weekId, day, employeeId, updates) => {
    const current = get().schedules.find((item) => item.weekId === weekId);
    if (!current) {
      get().showToast('Không tìm thấy tuần lịch cần cập nhật ca!', 'error');
      throw new Error('Schedule not found');
    }

    const existing = current.assignments[day]?.find((item) => item.employeeId === employeeId);
    if (!existing) {
      get().showToast('Không tìm thấy ca làm việc cần cập nhật!', 'error');
      throw new Error('Assignment not found');
    }

    try {
      const result = existing.assignmentId
        ? await scheduleApi.updateAssignment(
            weekId,
            existing.assignmentId,
            current.version ?? 0,
            { ...updates, day },
          )
        : await scheduleApi.replaceAssignments(weekId, current.version ?? 0, {
            ...assignmentPayload(current.assignments),
            [day]: (current.assignments[day] ?? []).map((item) =>
              item.employeeId === employeeId
                ? withoutAssignmentId({ ...item, ...updates })
                : withoutAssignmentId(item),
            ),
          });

      set((state) => ({
        schedules: replaceSchedule(state.schedules, result.schedule),
        scheduleError: null,
      }));
      showScheduleMutationWarning(get().showToast, result.warnings, 'Đã cập nhật ca làm việc!', 'success');
      return result.schedule;
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      set({ scheduleError: message });
      get().showToast(message, 'error');
      await refreshAfterScheduleError(error, get().loadSchedules);
      throw error;
    }
  },

  submitPreferences: async (weekId, employeeId, dayPreferences) => {
    const currentUser = get().currentUser;
    const current = get().schedules.find((schedule) => schedule.weekId === weekId);
    if (!current || !currentUser || currentUser.id !== employeeId) {
      get().showToast('Không tìm thấy thông tin đăng ký phù hợp!', 'error');
      throw new Error('Preference context not found');
    }

    try {
      const updated = await scheduleApi.updateMyPreference(
        weekId,
        current.version ?? 0,
        dayPreferences,
      );
      set((state) => ({
        schedules: state.schedules.map((schedule) =>
          schedule.weekId === updated.weekId ? updated : schedule,
        ),
        scheduleError: null,
      }));
      get().showToast('Đã lưu đăng ký ca làm việc thành công!', 'success');
      return updated;
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      set({ scheduleError: message });
      get().showToast(message, 'error');
      void get().loadSchedules();
      throw error;
    }
  },

  updateForecast: async (weekId, forecast) => {
    const current = get().schedules.find((schedule) => schedule.weekId === weekId);
    if (!current) {
      get().showToast('Không tìm thấy tuần lịch cần cập nhật định biên!', 'error');
      throw new Error('Schedule not found');
    }

    try {
      const updated = await scheduleApi.updateForecast(weekId, current.version ?? 0, forecast);
      set((state) => ({
        schedules: replaceSchedule(state.schedules, updated),
        scheduleError: null,
      }));
      get().showToast('Đã cập nhật định biên dự trù!', 'success');
      return updated;
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      set({ scheduleError: message });
      get().showToast(message, 'error');
      await refreshAfterScheduleError(error, get().loadSchedules);
      throw error;
    }
  },

  addEmployee: async (employee) => {
    try {
      const created = await employeeApi.create(employee);
      set((state) => ({
        employees: [...state.employees, created],
        catalogError: null,
      }));
      get().showToast(`Đã thêm nhân viên ${created.name} thành công!`, 'success');
      return created;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      get().showToast('Lỗi khi thêm nhân viên!', 'error');
      throw error;
    }
  },
  
  updateEmployee: async (oldId, employee) => {
    try {
      const updated = await employeeApi.update(oldId, employee);
      set((state) => ({
        employees: state.employees.map((item) =>
          item.id === oldId ? updated : item,
        ),
        currentUser:
          state.currentUser?.id === oldId ? updated : state.currentUser,
        catalogError: null,
      }));
      get().showToast(`Đã cập nhật thông tin nhân viên ${updated.name}!`, 'success');
      return updated;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      get().showToast('Lỗi khi cập nhật thông tin nhân viên!', 'error');
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
      get().showToast(
        `Đã ${status === 'active' ? 'kích hoạt' : 'ngưng kích hoạt'} nhân viên ${updated.name}!`,
        'success',
      );
      return updated;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      get().showToast('Lỗi khi cập nhật trạng thái nhân viên!', 'error');
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
      get().showToast(`Đã thêm mã ca ${created.code} thành công!`, 'success');
      return created;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      get().showToast('Lỗi khi thêm mã ca mới!', 'error');
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
      get().showToast(`Đã cập nhật mã ca ${updated.code}!`, 'success');
      return updated;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      get().showToast('Lỗi khi cập nhật mã ca!', 'error');
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
      get().showToast(
        `Đã ${status === 'active' ? 'bật' : 'tắt'} mã ca ${updated.code}!`,
        'success',
      );
      return updated;
    } catch (error: unknown) {
      set({ catalogError: getApiErrorMessage(error) });
      get().showToast('Lỗi khi cập nhật trạng thái mã ca!', 'error');
      throw error;
    }
  },
}));
