import type {
  Employee,
  EmployeePreference,
  ShiftAssignment,
  ShiftCode,
  WeeklySchedule,
} from '../data/mockData';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  profile: Employee;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface PaginatedSuccessResponse<T> extends SuccessResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ScheduleWarning {
  code: string;
  message: string;
  employeeId?: string;
  day?: string;
  role?: string;
  assignmentId?: string;
}

export interface ScheduleMutationResult {
  schedule: WeeklySchedule;
  warnings: ScheduleWarning[];
}

function assignmentWritePayload(assignment: ShiftAssignment) {
  return {
    employeeId: assignment.employeeId,
    shiftCode: assignment.shiftCode,
    primaryRole: assignment.primaryRole,
    ...(assignment.secondaryRole ? { secondaryRole: assignment.secondaryRole } : {}),
    ...(assignment.note ? { note: assignment.note } : {}),
  };
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown[];

  constructor(
    status: number,
    code: string,
    message: string,
    details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<AuthSession> | null = null;

function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | SuccessResponse<T>
    | ApiErrorPayload
    | null;

  if (!response.ok) {
    if (payload && !payload.success) {
      throw new ApiError(
        response.status,
        payload.error.code,
        payload.error.message,
        payload.error.details,
      );
    }
    throw new ApiError(response.status, 'HTTP_ERROR', 'Không thể kết nối tới máy chủ');
  }

  if (!payload || !payload.success) {
    throw new ApiError(500, 'INVALID_API_RESPONSE', 'Phản hồi từ máy chủ không hợp lệ');
  }

  return payload.data;
}

async function refreshSession(): Promise<AuthSession> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
      .then((response) => parseResponse<AuthSession>(response))
      .then((session) => {
        setAccessToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retryAfterRefresh = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && retryAfterRefresh && path !== '/api/auth/refresh') {
    try {
      await refreshSession();
      return apiRequest<T>(path, init, false);
    } catch {
      setAccessToken(null);
    }
  }

  return parseResponse<T>(response);
}

async function apiRequestPage<T>(
  path: string,
  retryAfterRefresh = true,
): Promise<PaginatedSuccessResponse<T>> {
  const headers = new Headers();
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && retryAfterRefresh) {
    try {
      await refreshSession();
      return apiRequestPage<T>(path, false);
    } catch {
      setAccessToken(null);
    }
  }

  const payload = (await response.json().catch(() => null)) as
    | PaginatedSuccessResponse<T>
    | ApiErrorPayload
    | null;
  if (!response.ok) {
    if (payload && !payload.success) {
      throw new ApiError(
        response.status,
        payload.error.code,
        payload.error.message,
        payload.error.details,
      );
    }
    throw new ApiError(response.status, 'HTTP_ERROR', 'Không thể kết nối tới máy chủ');
  }
  if (!payload || !payload.success || !('meta' in payload)) {
    throw new ApiError(500, 'INVALID_API_RESPONSE', 'Phản hồi từ máy chủ không hợp lệ');
  }
  return payload;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const separator = path.includes('?') ? '&' : '?';
  const first = await apiRequestPage<T>(`${path}${separator}page=1&limit=100`);
  if (first.meta.totalPages <= 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      apiRequestPage<T>(`${path}${separator}page=${index + 2}&limit=100`),
    ),
  );
  return [...first.data, ...remaining.flatMap((page) => page.data)];
}

async function login(path: string, body: object): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    false,
  );
  setAccessToken(session.accessToken);
  return session;
}

export const authApi = {
  bootstrap: refreshSession,

  loginEmployee(employeeIdOrPhone: string): Promise<AuthSession> {
    return login('/api/auth/login/employee', { employeeIdOrPhone });
  },

  loginManager(username: string, password: string): Promise<AuthSession> {
    return login('/api/auth/login/manager', { username, password });
  },

  async logout(): Promise<void> {
    try {
      await apiRequest<void>('/api/auth/logout', { method: 'POST', body: '{}' });
    } finally {
      setAccessToken(null);
    }
  },

  me(): Promise<Employee> {
    return apiRequest<Employee>('/api/auth/me');
  },
};

export const employeeApi = {
  list(): Promise<Employee[]> {
    return fetchAllPages<Employee>('/api/employees');
  },

  get(id: string): Promise<Employee> {
    return apiRequest<Employee>(`/api/employees/${encodeURIComponent(id)}`);
  },

  create(employee: Employee): Promise<Employee> {
    const { id, ...fields } = employee;
    return apiRequest<Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        ...fields,
        ...(id ? { id } : {}),
      }),
    });
  },

  update(oldId: string, employee: Employee): Promise<Employee> {
    const { id, ...fields } = employee;
    return apiRequest<Employee>(`/api/employees/${encodeURIComponent(oldId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        id,
        ...fields,
      }),
    });
  },

  updateStatus(id: string, status: Employee['status']): Promise<Employee> {
    return apiRequest<Employee>(`/api/employees/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

function shiftPayload(shift: ShiftCode) {
  return {
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakMinutes: shift.breakMinutes,
    type: shift.type,
    color: shift.color,
    ...(shift.note ? { note: shift.note } : {}),
    isSplit: Boolean(shift.isSplit),
    startTime2: shift.isSplit ? (shift.startTime2 ?? null) : null,
    endTime2: shift.isSplit ? (shift.endTime2 ?? null) : null,
    applicableDepartments: shift.applicableDepartments ?? [],
    status: shift.status ?? 'active',
  };
}

export const shiftApi = {
  list(): Promise<ShiftCode[]> {
    return fetchAllPages<ShiftCode>('/api/shifts');
  },

  create(shift: ShiftCode): Promise<ShiftCode> {
    return apiRequest<ShiftCode>('/api/shifts', {
      method: 'POST',
      body: JSON.stringify({ code: shift.code, ...shiftPayload(shift) }),
    });
  },

  update(shift: ShiftCode): Promise<ShiftCode> {
    return apiRequest<ShiftCode>(`/api/shifts/${encodeURIComponent(shift.code)}`, {
      method: 'PUT',
      body: JSON.stringify(shiftPayload(shift)),
    });
  },

  updateStatus(code: string, status: 'active' | 'inactive'): Promise<ShiftCode> {
    return apiRequest<ShiftCode>(`/api/shifts/${encodeURIComponent(code)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

export const scheduleApi = {
  list(): Promise<WeeklySchedule[]> {
    return fetchAllPages<WeeklySchedule>('/api/schedules');
  },

  get(weekId: string): Promise<WeeklySchedule> {
    return apiRequest<WeeklySchedule>(`/api/schedules/${encodeURIComponent(weekId)}`);
  },

  createNext(): Promise<WeeklySchedule> {
    return apiRequest<WeeklySchedule>('/api/schedules/create-next', {
      method: 'POST',
      body: '{}',
    });
  },

  updateStatus(
    weekId: string,
    status: WeeklySchedule['status'],
    version: number,
  ): Promise<WeeklySchedule> {
    return apiRequest<WeeklySchedule>(`/api/schedules/${encodeURIComponent(weekId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, version }),
    });
  },

  getMyPreference(weekId: string): Promise<EmployeePreference | null> {
    return apiRequest<EmployeePreference | null>(
      `/api/schedules/${encodeURIComponent(weekId)}/preferences/me`,
    );
  },

  updateMyPreference(
    weekId: string,
    version: number,
    dayPreferences: EmployeePreference['dayPreferences'],
  ): Promise<WeeklySchedule> {
    return apiRequest<WeeklySchedule>(
      `/api/schedules/${encodeURIComponent(weekId)}/preferences/me`,
      {
        method: 'PUT',
        body: JSON.stringify({ version, dayPreferences }),
      },
    );
  },

  listPreferences(weekId: string): Promise<EmployeePreference[]> {
    return apiRequest<EmployeePreference[]>(
      `/api/schedules/${encodeURIComponent(weekId)}/preferences`,
    );
  },

  overridePreference(
    weekId: string,
    employeeId: string,
    version: number,
    dayPreferences: EmployeePreference['dayPreferences'],
    reason: string,
  ): Promise<WeeklySchedule> {
    return apiRequest<WeeklySchedule>(
      `/api/schedules/${encodeURIComponent(weekId)}/preferences/${encodeURIComponent(employeeId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ version, dayPreferences, reason }),
      },
    );
  },

  replaceAssignments(
    weekId: string,
    version: number,
    assignments: WeeklySchedule['assignments'],
  ): Promise<ScheduleMutationResult> {
    return apiRequest<ScheduleMutationResult>(
      `/api/schedules/${encodeURIComponent(weekId)}/assignments`,
      {
        method: 'PUT',
        body: JSON.stringify({ version, assignments }),
      },
    );
  },

  createAssignment(
    weekId: string,
    version: number,
    day: string,
    assignment: ShiftAssignment,
  ): Promise<ScheduleMutationResult> {
    return apiRequest<ScheduleMutationResult>(
      `/api/schedules/${encodeURIComponent(weekId)}/assignments`,
      {
        method: 'POST',
        body: JSON.stringify({ version, day, assignment: assignmentWritePayload(assignment) }),
      },
    );
  },

  updateAssignment(
    weekId: string,
    assignmentId: string,
    version: number,
    updates: Partial<ShiftAssignment> & { day?: string },
  ): Promise<ScheduleMutationResult> {
    const payload = {
      ...(updates.day ? { day: updates.day } : {}),
      ...(updates.shiftCode ? { shiftCode: updates.shiftCode } : {}),
      ...(updates.primaryRole ? { primaryRole: updates.primaryRole } : {}),
      ...(updates.secondaryRole !== undefined ? { secondaryRole: updates.secondaryRole } : {}),
      ...(updates.note !== undefined ? { note: updates.note } : {}),
    };
    return apiRequest<ScheduleMutationResult>(
      `/api/schedules/${encodeURIComponent(weekId)}/assignments/${encodeURIComponent(assignmentId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ version, ...payload }),
      },
    );
  },

  deleteAssignment(
    weekId: string,
    assignmentId: string,
    version: number,
  ): Promise<ScheduleMutationResult> {
    return apiRequest<ScheduleMutationResult>(
      `/api/schedules/${encodeURIComponent(weekId)}/assignments/${encodeURIComponent(assignmentId)}?version=${encodeURIComponent(String(version))}`,
      { method: 'DELETE' },
    );
  },

  updateForecast(
    weekId: string,
    version: number,
    forecast: WeeklySchedule['forecast'],
  ): Promise<WeeklySchedule> {
    return apiRequest<WeeklySchedule>(`/api/schedules/${encodeURIComponent(weekId)}/forecast`, {
      method: 'PUT',
      body: JSON.stringify({ version, forecast }),
    });
  },
};

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return 'Không thể kết nối tới backend. Hãy kiểm tra Express đang chạy.';
  }
  return 'Đã xảy ra lỗi không xác định';
}
