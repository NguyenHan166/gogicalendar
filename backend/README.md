# GogiCalendar Backend

Express.js, TypeScript, MongoDB, and Mongoose backend for GogiCalendar.

Phase 3 provides the application foundation, authentication, role-based
authorization, and the employee and shift-code APIs. Schedule business endpoints
are implemented in later phases.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- A MongoDB Atlas cluster
- Docker with Docker Compose only for optional local MongoDB

## MongoDB Atlas setup

1. Create an Atlas database user with only the permissions required for the
   `gogicalendar` database.
2. Add the development machine's public IP and the production server's outbound IP
   to Atlas Network Access. Avoid `0.0.0.0/0` except for temporary troubleshooting.
3. Copy the Atlas SRV connection string to `.env`. URL-encode special characters in
   the username or password.
4. Keep `MONGODB_DB_NAME=gogicalendar` explicit. An SRV URI without a database path
   can otherwise connect to MongoDB's `test` database.

Atlas manages TLS, replica-set topology, and failover. Do not run
`npm run mongo:init` against Atlas.

## Quick start with Atlas

```bash
cd backend
cp .env.example .env
npm install
npm run indexes
SEED_DEMO_DATA=true npm run seed
npm run dev
```

Review the seed data before running it against a shared Atlas environment.

The API listens on `http://localhost:3000` by default:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

Expected responses:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

## Frontend integration

The frontend authentication screens call the Phase 2 endpoints directly. For local
development, start both applications:

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

Vite proxies `/api` to `http://localhost:3000`, so no frontend environment variable
is required locally. For a separately hosted backend, set
`VITE_API_BASE_URL=https://api.example.com` in the frontend build environment and
add the frontend origin to backend `CORS_ORIGINS`.

The frontend keeps the JWT access token in memory and restores sessions through the
HttpOnly refresh cookie. Employee and shift screens now use these backend APIs.
Schedule integration remains work for later phases.

### Existing JSON imports

`employees.json` and `shift_codes.json` can be imported directly into the
`employees` and `shift_codes` collections. Authentication remains compatible with
formatted phone values such as `0901.111.001`.

A direct employee import does not create `user_credentials`. On the first valid
manager login, the backend creates the missing manager credential only when all of
these match the environment configuration:

- `SEED_MANAGER_ID`
- `SEED_MANAGER_USERNAME`
- `SEED_MANAGER_PASSWORD`

After that first login, normal bcrypt credential authentication is used. Employee
credentials are also created lazily on their first successful identifier login.

```json
{
  "success": true,
  "data": {
    "status": "ready"
  }
}
```

## Project structure

```text
backend/
├── docs/                  API and data design
├── scripts/               Operational commands
├── src/
│   ├── config/            Environment and logger
│   ├── lib/               Shared infrastructure
│   ├── middlewares/       Express middleware
│   ├── models/            Mongoose schemas and models
│   ├── modules/           Feature modules
│   ├── routes/            Route composition
│   ├── types/             Type augmentation
│   ├── app.ts             Side-effect-free app factory
│   └── server.ts          Database and HTTP bootstrap
└── tests/                 Vitest and Supertest integration tests
```

## Environment

All environment variables are validated by Zod during process startup. The application exits immediately when configuration is invalid.

Important variables:

| Variable                              | Default                 | Purpose                             |
| ------------------------------------- | ----------------------- | ----------------------------------- |
| `NODE_ENV`                            | `development`           | Runtime mode                        |
| `HOST`                                | `0.0.0.0`               | HTTP bind address                   |
| `PORT`                                | `3000`                  | HTTP port                           |
| `MONGODB_URI`                         | required                | Atlas application connection        |
| `MONGODB_DB_NAME`                     | `gogicalendar`          | Explicit application database       |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `5000`                  | Initial connection timeout          |
| `MONGODB_MAX_POOL_SIZE`               | `20`                    | Maximum connections per app process |
| `MONGODB_MIN_POOL_SIZE`               | `0`                     | Minimum idle connections            |
| `CORS_ORIGINS`                        | `http://localhost:5173` | Comma-separated allowlist           |
| `JSON_BODY_LIMIT`                     | `1mb`                   | Request body limit                  |
| `RATE_LIMIT_MAX`                      | `120`                   | Requests per rate-limit window      |
| `JWT_ACCESS_SECRET`                   | required                | Access-token signing secret         |
| `ACCESS_TOKEN_TTL_SECONDS`            | `900`                   | Access-token lifetime               |
| `REFRESH_TOKEN_TTL_SECONDS`           | `2592000`               | Refresh-token lifetime              |
| `AUTH_MAX_FAILED_ATTEMPTS`            | `5`                     | Manager failures before lockout     |
| `AUTH_LOCK_DURATION_MS`               | `900000`                | Manager credential lock duration    |
| `SEED_DEMO_DATA`                      | `false`                 | Enables idempotent demo seed        |

Never commit `.env` or production secrets.

## Optional local MongoDB

Transactions require a replica set. The Compose service starts a single-node replica set for local development.

```bash
docker compose up -d mongo
docker compose ps
MONGODB_URI=mongodb://localhost:27017/gogicalendar?replicaSet=rs0 \
LOCAL_MONGODB_INIT_URI=mongodb://localhost:27017/admin?directConnection=true \
LOCAL_MONGODB_REPLICA_SET=rs0 \
LOCAL_MONGODB_REPLICA_SET_HOST=localhost:27017 \
npm run mongo:init
```

The Compose health check also initializes the replica set idempotently. The init
script is an explicit recovery command and intentionally refuses Atlas SRV URIs.

If MongoDB was previously initialized with a different member hostname, remove the local volume only when losing local data is acceptable:

```bash
docker compose down -v
docker compose up -d mongo
```

## Index management

Every Mongoose schema uses `autoIndex: false`. Production startup never creates or drops indexes implicitly.

Run index synchronization explicitly:

```bash
npm run indexes
```

The command creates missing declared indexes and does not drop existing Atlas
indexes. Remove obsolete indexes through a separately reviewed migration or Atlas
administration workflow. A deployment identity may create indexes while the normal
application identity remains more restricted.

## Seed framework

The seed is idempotent and disabled by default.

```bash
SEED_DEMO_DATA=true npm run seed
```

It creates:

- One manager profile configured by `SEED_MANAGER_*`
- One manager credential using username `SEED_MANAGER_USERNAME` (default `rm4650`)
- Base shift codes `OFF`, `NPL`, and `P22`

`SEED_MANAGER_PASSWORD` is required when `SEED_DEMO_DATA=true`. The seed hashes it
with bcrypt before persistence and never stores the plaintext password.

## Authentication

Manager login:

```bash
curl -X POST http://localhost:3000/api/auth/login/manager \
  -H 'content-type: application/json' \
  -d '{"username":"rm4650","password":"your-seed-password"}'
```

Employee login accepts an employee ID or a phone number. Phone punctuation and
spaces are removed before lookup:

```bash
curl -X POST http://localhost:3000/api/auth/login/employee \
  -H 'content-type: application/json' \
  -d '{"employeeIdOrPhone":"0901 234-567"}'
```

Access tokens are short-lived JWTs. Refresh tokens are random opaque values; only
their SHA-256 hashes are stored. A refresh rotates the token, and reuse of an old
rotated token revokes its entire token family.

The login response includes `refreshToken` for current frontend compatibility and
also sets an HttpOnly `refresh_token` cookie. `/auth/refresh` and `/auth/logout`
accept the token through the body, `X-Refresh-Token`, or that cookie.

Protected routes use:

```text
Authorization: Bearer <access-token>
```

Reusable middleware is available as `authenticate`, `requireManager`,
`requireEmployee`, and `requireSelfAccess`.

## Employees

Managers can list, create, update, activate, and deactivate employees. Employees
can only read their own profile through `GET /api/employees/:id`.

`GET /api/employees` supports `page`, `limit`, `search`, `level`,
`scheduleGroup`, `primaryDepartment`, `skill`, and `status`. Phone numbers are
normalized to digits before storage and uniqueness checks. A create request may
omit `id` only when `level` is `HUB`; the API generates an ID in the form
`HUB_<timestamp>_<random>`.

Employee records are deactivated through `PATCH /api/employees/:id/status`.
There is no hard-delete endpoint, so historical schedule references remain valid.

## Shift codes

Authenticated users can list and retrieve shift codes. Employees only see active
shifts; managers may filter by status and can create, update, activate, or
deactivate shifts.

`GET /api/shifts` supports `page`, `limit`, `search`, `type`, `status`, and
`department`. Codes are normalized to uppercase. Times use `HH:mm`,
`breakMinutes` is a non-negative integer, and `type` is `work`, `off`, or
`leave`. Work shifts require the first time interval; split shifts require the
second interval.

Shift records are deactivated through `PATCH /api/shifts/:code/status`. There is
no hard-delete endpoint because assignments and preferences reference shift codes.

## Commands

| Command                 | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Start development server with watch mode  |
| `npm run build`         | Compile production JavaScript             |
| `npm start`             | Run compiled server                       |
| `npm run lint`          | Run ESLint                                |
| `npm run format`        | Format supported files                    |
| `npm run format:check`  | Check formatting                          |
| `npm run typecheck`     | Run strict TypeScript checks              |
| `npm test`              | Run Vitest once                           |
| `npm run test:coverage` | Run coverage                              |
| `npm run mongo:init`    | Initialize the optional local replica set |
| `npm run indexes`       | Create missing declared indexes           |
| `npm run seed`          | Run idempotent seed                       |
| `npm run check`         | Format, lint, typecheck, test, and build  |

## Testing

Integration tests use `MongoMemoryReplSet`, not a mocked database. The first run may download a MongoDB test binary.

```bash
npm test
```

The suite isolates data between tests and closes Mongoose and replica-set processes after completion.

## HTTP safety defaults

- Helmet security headers
- CORS allowlist
- JSON and URL-encoded body limits
- API rate limiting
- Stricter manager and employee login rate limits by IP and login identifier
- Manager credential lockout after repeated password failures
- Request IDs returned through `x-request-id`
- Structured Pino request logs with credential/token redaction
- Audit events for login, refresh, refresh-token reuse, logout, and rate limiting
- Standard error envelope
- No stack traces in production responses
- Graceful HTTP and MongoDB shutdown

## Error envelope

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Không tìm thấy tài nguyên",
    "details": []
  }
}
```

See `docs/openapi.yaml`, `docs/api-contract.md`, and `docs/business-rules.md` for
the API contract and business rules.
