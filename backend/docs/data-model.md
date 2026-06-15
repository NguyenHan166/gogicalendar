# GogiCalendar MongoDB Data Model

## 1. Design decisions

- MongoDB is the source of truth.
- Mongoose is the ODM.
- `WeeklySchedule` is the aggregate root for one calendar week.
- Preferences, assignments, and forecast targets are embedded because they are bounded by one week and are normally read together.
- Employees, shifts, credentials, refresh tokens, and audit logs are separate collections because they have independent lifecycles and query patterns.
- MongoDB `_id` values are internal. Public APIs use business identifiers such as `employeeId`, `shiftCode`, and `weekId`.
- Dates are stored as BSON `Date` values in UTC. Date-only API fields are serialized as `YYYY-MM-DD`.
- Display labels such as `Thứ 2` are API mappings. Stored schedule entries use ISO date keys/values so storage is not coupled to Vietnamese UI text.
- `WeeklySchedule.version` is the public optimistic concurrency token. It is incremented on every aggregate mutation.

## 2. Collection diagram

```mermaid
flowchart LR
    UC[UserCredential] -->|employeeRef| E[Employee]
    RT[RefreshToken] -->|credentialRef| UC
    AL[AuditLog] -.->|actorEmployeeId| E

    WS[WeeklySchedule aggregate]
    WS -->|references by employeeId| E
    WS -->|references by shiftCode| SC[ShiftCode]

    WS *-- P[embedded preferences]
    P *-- DP[embedded dayPreferences]
    WS *-- A[embedded assignments]
    WS *-- F[embedded forecastTargets]

    P -. employeeId .-> E
    DP -. preferredShiftCode .-> SC
    A -. employeeId .-> E
    A -. shiftCode .-> SC
```

MongoDB does not enforce foreign keys. Services must validate referenced employees and shifts before writing schedule data.

## 3. Collections

### 3.1 employees

```ts
interface EmployeeDocument {
  _id: ObjectId;
  employeeId: string;
  name: string;
  phone: string;
  role: 'employee' | 'manager';
  level: string;
  scheduleGroup: string;
  primaryDepartment: string;
  skills: Record<string, boolean>;
  note?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

Rules:

- `employeeId` is the public identifier and maps to FE `Employee.id`.
- `phone` contains digits only.
- Empty or false skills are removed before persistence where practical.
- HUB personnel may omit an ID on create. The service generates `HUB_<timestamp>_<random>`.
- Employees are soft-disabled with `status=inactive`; they are not hard-deleted after schedule references exist.

Indexes:

| Index                                                 | Type     | Purpose                                      |
| ----------------------------------------------------- | -------- | -------------------------------------------- |
| `{ employeeId: 1 }`                                   | unique   | Login and public lookup                      |
| `{ phone: 1 }`                                        | unique   | Employee login; phone is required in the MVP |
| `{ status: 1, scheduleGroup: 1, name: 1 }`            | compound | Employee directory filters                   |
| `{ status: 1, primaryDepartment: 1 }`                 | compound | Scheduling candidate filters                 |
| `{ name: "text", employeeId: "text", phone: "text" }` | text     | MVP search                                   |

Dynamic skill filtering uses `skills.<skillName>: true`. If this becomes slow, add indexes for the small set of configured skills or migrate skills to a bounded array.

### 3.2 user_credentials

```ts
interface UserCredentialDocument {
  _id: ObjectId;
  employeeRef: ObjectId;
  username?: string;
  passwordHash?: string;
  authType: 'manager_password' | 'employee_identifier';
  status: 'active' | 'disabled';
  failedLoginCount: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

Rules:

- Manager credentials use `username` and `passwordHash`.
- Employee identifier login is tied to an active employee and stores no password.
- Credentials are disabled when their employee is inactive.

Indexes:

| Index                           | Type           | Purpose                            |
| ------------------------------- | -------------- | ---------------------------------- |
| `{ employeeRef: 1 }`            | unique         | One credential per employee in MVP |
| `{ username: 1 }`               | unique partial | Manager login                      |
| `{ status: 1, lockedUntil: 1 }` | compound       | Authentication checks              |

### 3.3 shift_codes

```ts
interface ShiftCodeDocument {
  _id: ObjectId;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  type: 'work' | 'off' | 'leave';
  color: string;
  note?: string;
  isSplit: boolean;
  startTime2?: string | null;
  endTime2?: string | null;
  applicableDepartments: string[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

Rules:

- Codes are normalized to uppercase.
- Time strings use `HH:mm`.
- Work shifts require a first interval.
- Split shifts require both second interval fields.
- Off/leave shifts may have empty time fields and never count toward staffing.
- Shift codes are disabled instead of deleted after use.

Indexes:

| Index                                     | Type              | Purpose              |
| ----------------------------------------- | ----------------- | -------------------- |
| `{ code: 1 }`                             | unique            | Shift lookup         |
| `{ status: 1, type: 1, code: 1 }`         | compound          | Shift picker         |
| `{ status: 1, applicableDepartments: 1 }` | multikey compound | Department filtering |

### 3.4 weekly_schedules

```ts
interface WeeklyScheduleDocument {
  _id: ObjectId;
  weekId: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'registration_open' | 'registration_locked' | 'scheduling' | 'published';
  registrationDeadline?: Date;
  version: number;
  preferences: PreferenceSubdocument[];
  assignments: AssignmentSubdocument[];
  forecastTargets: ForecastTargetSubdocument[];
  publishedAt?: Date;
  publishedByEmployeeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PreferenceSubdocument {
  _id: ObjectId;
  employeeId: string;
  dayPreferences: DayPreferenceSubdocument[];
  submittedAt: Date;
  updatedAt: Date;
  overriddenByEmployeeId?: string;
  overrideReason?: string;
}

interface DayPreferenceSubdocument {
  date: Date;
  type: 'available' | 'preferred' | 'unavailable';
  preferredShiftCode?: string;
  note?: string;
}

interface AssignmentSubdocument {
  _id: ObjectId;
  date: Date;
  employeeId: string;
  shiftCode: string;
  primaryRole: string;
  secondaryRole?: string;
  note?: string;
}

interface ForecastTargetSubdocument {
  date: Date;
  department: string;
  target: number;
  slotStart?: string;
  slotEnd?: string;
}
```

Why arrays instead of maps:

- MongoDB field names cannot safely represent every future department or UI label.
- Date arrays support validation, array filters, and future time-slot extension.
- DTO mapping reconstructs FE maps keyed by Vietnamese day labels.

Indexes:

| Index                                            | Type     | Purpose                              |
| ------------------------------------------------ | -------- | ------------------------------------ |
| `{ weekId: 1 }`                                  | unique   | Public schedule lookup               |
| `{ startDate: 1 }`                               | unique   | Prevent duplicate week starts        |
| `{ startDate: 1, endDate: 1 }`                   | compound | Date-range lookup and overlap checks |
| `{ status: 1, startDate: -1 }`                   | compound | Schedule list and visibility         |
| `{ "preferences.employeeId": 1, startDate: -1 }` | multikey | Employee preference history          |
| `{ "assignments.employeeId": 1, startDate: -1 }` | multikey | Employee schedule history            |

Important constraints enforced by the service:

- Monday start and Sunday end.
- No overlapping weekly date ranges.
- One preference subdocument per employee.
- One assignment per employee per date in MVP.
- All embedded dates must fall within the schedule.
- All employee and shift business IDs must reference active/existing records as required.
- Status changes must follow the state machine.

### 3.5 refresh_tokens

```ts
interface RefreshTokenDocument {
  _id: ObjectId;
  credentialRef: ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenHash?: string;
  createdByIp?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes:

| Index                               | Type                        | Purpose             |
| ----------------------------------- | --------------------------- | ------------------- |
| `{ tokenHash: 1 }`                  | unique                      | Refresh lookup      |
| `{ credentialRef: 1, familyId: 1 }` | compound                    | Revoke token family |
| `{ expiresAt: 1 }`                  | TTL `expireAfterSeconds: 0` | Automatic cleanup   |

Revoked tokens may disappear at expiry. Security events remain in `audit_logs`.

### 3.6 audit_logs

```ts
interface AuditLogDocument {
  _id: ObjectId;
  actorEmployeeId?: string;
  actorRole?: 'employee' | 'manager' | 'system';
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  outcome: 'success' | 'failure';
  reason?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
```

Indexes:

| Index                                               | Type            | Purpose                    |
| --------------------------------------------------- | --------------- | -------------------------- |
| `{ createdAt: -1 }`                                 | compound prefix | Recent logs                |
| `{ resourceType: 1, resourceId: 1, createdAt: -1 }` | compound        | Resource history           |
| `{ actorEmployeeId: 1, createdAt: -1 }`             | compound        | Actor history              |
| `{ action: 1, outcome: 1, createdAt: -1 }`          | compound        | Security/operation filters |

Audit logs have no TTL by default. Retention can be introduced later as an explicit policy.

## 4. Embed versus reference

| Data               | Choice                   | Reason                                                                 |
| ------------------ | ------------------------ | ---------------------------------------------------------------------- |
| Weekly preferences | Embed                    | Bounded by active employees and always queried in week context         |
| Weekly assignments | Embed                    | One week is the write boundary; atomic aggregate replacement is useful |
| Forecast targets   | Embed                    | Small bounded matrix, read with schedule                               |
| Employee           | Reference by business ID | Independent lifecycle and directory queries                            |
| Shift code         | Reference by code        | Independent configuration and picker queries                           |
| Credential/token   | Separate collections     | Security lifecycle and TTL                                             |
| Audit log          | Separate collection      | Append-only, potentially large                                         |

## 5. Document size and extraction thresholds

MongoDB documents have a 16 MB BSON limit. A restaurant week is expected to contain tens of employees, 7 preferences each, and at most one assignment per employee/day, which is comfortably below the limit.

Measure `bsonSize` in production diagnostics. Split embedded arrays into dedicated collections when any of these become true:

- A schedule approaches 8 MB, leaving insufficient update headroom.
- Multiple stores/locations are combined into one weekly document.
- Assignments gain many intra-shift segments, comments, or change history.
- Concurrent writes to different employees become frequent enough to cause repeated version conflicts.
- Queries commonly read individual assignments/preferences without the schedule.

If extraction is needed, preserve the API DTO so FE does not change.

## 6. Integrity, deletion, and transactions

- MongoDB references are checked in services before writes.
- Employees and shifts are deactivated, not hard-deleted after use.
- A single schedule mutation uses one atomic conditional update with `{ weekId, version }`.
- Cross-collection operations that must be all-or-nothing use a Mongoose session and transaction.
- MongoDB must run as a replica set in local, test, and production environments.
- Audit logging should be in the same transaction for high-value manager mutations when atomic audit is required.
- A version mismatch returns HTTP `409` with code `VERSION_CONFLICT`.

## 7. DTO mapping

| MongoDB field              | API field                        | Frontend field                                  |
| -------------------------- | -------------------------------- | ----------------------------------------------- |
| `Employee.employeeId`      | `id`                             | `Employee.id`                                   |
| `Employee.role`            | `role`                           | `employee \| manager`                           |
| `ShiftCode.code`           | `code`                           | `ShiftCode.code`                                |
| `WeeklySchedule.weekId`    | `weekId`                         | `WeeklySchedule.weekId`                         |
| BSON `startDate`           | `YYYY-MM-DD`                     | `startDate`                                     |
| embedded assignments array | map by Vietnamese day label      | `assignments[day]`                              |
| embedded preferences array | preference DTO array             | `preferences[]`                                 |
| day preference date array  | map by Vietnamese day label      | `dayPreferences[day]`                           |
| forecast target array      | nested map by day and department | `forecast[day][department]`                     |
| `version`                  | `version`                        | new integration field used for conflict control |
