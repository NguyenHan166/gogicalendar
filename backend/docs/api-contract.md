# GogiCalendar API Contract

## 1. General conventions

- Base path: `/api`
- Media type: `application/json`
- Date-only format: `YYYY-MM-DD`
- Date-time format: ISO 8601 UTC
- Pagination defaults: `page=1`, `limit=20`; maximum `limit=100`
- IDs exposed to FE are business IDs, not MongoDB ObjectIds.
- Unknown request fields are rejected by validation for mutation endpoints.

Successful response:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": []
  }
}
```

List metadata:

```json
{
  "page": 1,
  "limit": 20,
  "total": 53,
  "totalPages": 3
}
```

## 2. Frontend-compatible DTOs

```ts
type UserRole = 'employee' | 'manager';
type EmployeeStatus = 'active' | 'inactive';
type ShiftType = 'work' | 'off' | 'leave';
type ScheduleStatus =
  | 'draft'
  | 'registration_open'
  | 'registration_locked'
  | 'scheduling'
  | 'published';

interface EmployeeDto {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  level: string;
  scheduleGroup: string;
  primaryDepartment: string;
  skills: Record<string, boolean>;
  note?: string;
  status: EmployeeStatus;
}

interface ShiftCodeDto {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  type: ShiftType;
  color: string;
  note?: string;
  startTime2?: string | null;
  endTime2?: string | null;
  isSplit: boolean;
  applicableDepartments?: string[];
  status?: EmployeeStatus;
}

interface EmployeePreferenceDto {
  employeeId: string;
  dayPreferences: Record<
    string,
    {
      type: 'available' | 'preferred' | 'unavailable';
      preferredShift?: string;
      note?: string;
    }
  >;
}

interface ShiftAssignmentDto {
  assignmentId: string;
  employeeId: string;
  shiftCode: string;
  primaryRole: string;
  secondaryRole?: string;
  note?: string;
}

interface WeeklyScheduleDto {
  weekId: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  version: number;
  registrationDeadline?: string;
  assignments: Record<string, ShiftAssignmentDto[]>;
  preferences: EmployeePreferenceDto[];
  forecast: Record<string, Record<string, number>>;
}
```

The seven day keys returned for FE compatibility are:

```text
Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7, Chủ Nhật
```

## 3. Endpoint summary

### Health

| Method | Path      | Auth   | Purpose           |
| ------ | --------- | ------ | ----------------- |
| GET    | `/health` | Public | Process liveness  |
| GET    | `/ready`  | Public | MongoDB readiness |

### Authentication

| Method | Path                   | Auth          | Purpose                 |
| ------ | ---------------------- | ------------- | ----------------------- |
| POST   | `/auth/login/manager`  | Public        | Manager password login  |
| POST   | `/auth/login/employee` | Public        | Employee ID/phone login |
| POST   | `/auth/refresh`        | Refresh token | Rotate session          |
| POST   | `/auth/logout`         | Authenticated | Revoke refresh token    |
| GET    | `/auth/me`             | Authenticated | Current profile         |

Login response data:

```json
{
  "accessToken": "jwt",
  "expiresIn": 900,
  "refreshToken": "opaque-token",
  "profile": {
    "id": "1048964",
    "name": "Lê Hải Anh",
    "role": "employee"
  }
}
```

The API returns the refresh token in the response body for FE compatibility and
also sets it as an HttpOnly cookie. Refresh/logout accept the token from the
`refreshToken` body field, `X-Refresh-Token` header, or `refresh_token` cookie.

### Employees

| Method | Path                     | Auth                     |
| ------ | ------------------------ | ------------------------ |
| GET    | `/employees`             | Manager                  |
| GET    | `/employees/{id}`        | Manager or same employee |
| POST   | `/employees`             | Manager                  |
| PUT    | `/employees/{id}`        | Manager                  |
| PATCH  | `/employees/{id}/status` | Manager                  |

Filters: `page`, `limit`, `search`, `level`, `scheduleGroup`, `primaryDepartment`, `skill`, `status`.

Create accepts an omitted `id` only when `level=HUB`. Update does not permit changing `id`.

### Shifts

| Method | Path                    | Auth          |
| ------ | ----------------------- | ------------- |
| GET    | `/shifts`               | Authenticated |
| GET    | `/shifts/{code}`        | Authenticated |
| POST   | `/shifts`               | Manager       |
| PUT    | `/shifts/{code}`        | Manager       |
| PATCH  | `/shifts/{code}/status` | Manager       |

Filters: `page`, `limit`, `search`, `type`, `status`, `department`.

### Schedules

| Method | Path                         | Auth                                     |
| ------ | ---------------------------- | ---------------------------------------- |
| GET    | `/schedules`                 | Authenticated with visibility projection |
| GET    | `/schedules/{weekId}`        | Authenticated with visibility projection |
| POST   | `/schedules`                 | Manager                                  |
| POST   | `/schedules/create-next`     | Manager                                  |
| PATCH  | `/schedules/{weekId}/status` | Manager                                  |

Schedule mutation request bodies include `version`.

Status request:

```json
{
  "status": "registration_locked",
  "version": 3,
  "reason": "Hết hạn đăng ký"
}
```

### Preferences

| Method | Path                                           | Auth          |
| ------ | ---------------------------------------------- | ------------- |
| GET    | `/schedules/{weekId}/preferences/me`           | Employee self |
| PUT    | `/schedules/{weekId}/preferences/me`           | Employee self |
| GET    | `/schedules/{weekId}/preferences`              | Manager       |
| PUT    | `/schedules/{weekId}/preferences/{employeeId}` | Manager       |

Self preference request:

```json
{
  "version": 2,
  "dayPreferences": {
    "Thứ 2": {
      "type": "preferred",
      "preferredShift": "P22",
      "note": "Em chỉ làm tối"
    },
    "Thứ 3": {
      "type": "available"
    }
  }
}
```

Manager override additionally requires `reason`.

### Assignments

| Method | Path                                             | Auth    |
| ------ | ------------------------------------------------ | ------- |
| PUT    | `/schedules/{weekId}/assignments`                | Manager |
| POST   | `/schedules/{weekId}/assignments`                | Manager |
| PATCH  | `/schedules/{weekId}/assignments/{assignmentId}` | Manager |
| DELETE | `/schedules/{weekId}/assignments/{assignmentId}` | Manager |

Bulk replacement:

```json
{
  "version": 5,
  "assignments": {
    "Thứ 2": [
      {
        "employeeId": "1048964",
        "shiftCode": "P22",
        "primaryRole": "Phục vụ"
      }
    ]
  }
}
```

Responses may include non-blocking warnings:

```json
{
  "success": true,
  "data": {
    "schedule": {},
    "warnings": [
      {
        "code": "EMPLOYEE_MISSING_SKILL",
        "employeeId": "1048964",
        "role": "Bar"
      }
    ]
  }
}
```

### Forecast and validation

| Method | Path                                   | Auth    |
| ------ | -------------------------------------- | ------- |
| PUT    | `/schedules/{weekId}/forecast`         | Manager |
| GET    | `/schedules/{weekId}/staffing-summary` | Manager |
| POST   | `/schedules/{weekId}/validate`         | Manager |

Forecast body:

```json
{
  "version": 6,
  "forecast": {
    "Thứ 2": {
      "ORDER + PHỤC VỤ": 4,
      "BOH (BẾP)": 3
    }
  }
}
```

Staffing summary query optionally accepts repeated slots:

```text
?slot=08:00-11:00&slot=17:00-22:00
```

### Audit logs

| Method | Path          | Auth    |
| ------ | ------------- | ------- |
| GET    | `/audit-logs` | Manager |

Filters: `page`, `limit`, `actorEmployeeId`, `action`, `resourceType`, `resourceId`, `outcome`, `from`, `to`.

## 4. Concurrency contract

- `WeeklyScheduleDto.version` is mandatory for schedule mutations.
- A successful mutation returns the incremented version.
- A stale version returns:

```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Lịch đã được cập nhật bởi người khác",
    "details": [
      {
        "currentVersion": 8
      }
    ]
  }
}
```

## 5. Visibility projections

Manager schedule DTO:

- Full assignments, preferences, and forecast.

Employee published DTO:

- Published assignments and forecast if needed by the total roster.
- Preferences contains only the requesting employee.

Employee registration DTO:

- Metadata and own preference.
- Assignments is an empty seven-day map.
- Other employees' preferences are omitted.

## 6. MongoDB-to-API-to-FE mapping

| MongoDB                                    | API DTO                          | FE compatibility               |
| ------------------------------------------ | -------------------------------- | ------------------------------ |
| `employeeId`                               | `id`                             | Direct                         |
| `role=employee`                            | `role=employee`                  | Resolves old `staff` conflict  |
| `ShiftCode.type`                           | `work/off/leave`                 | Direct                         |
| `WeeklySchedule.assignments[]` with `date` | `assignments[dayLabel][]`        | Mapper required                |
| `WeeklySchedule.preferences[]`             | `preferences[]`                  | Direct outer shape             |
| `dayPreferences[]` with `date`             | `dayPreferences[dayLabel]`       | Mapper required                |
| `forecastTargets[]`                        | `forecast[dayLabel][department]` | Mapper required                |
| `_id`                                      | omitted                          | FE never depends on MongoDB ID |
| assignment subdocument `_id`               | `assignmentId`                   | Needed for patch/delete        |
| `version`                                  | `version`                        | New field for API integration  |
