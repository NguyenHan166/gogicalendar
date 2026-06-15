# GogiCalendar Frontend

React, TypeScript, Zustand, Tailwind CSS, and Vite frontend for GogiCalendar.

## Backend integration

By default the app uses the Express API. Mock data is still kept in
`src/data/mockData.ts` for reference/dev experiments, but the active Zustand store
loads and mutates data through the backend.

- `POST /api/auth/login/manager`
- `POST /api/auth/login/employee`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/employees`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `PATCH /api/employees/:id/status`
- `GET /api/shifts`
- `POST /api/shifts`
- `PUT /api/shifts/:code`
- `PATCH /api/shifts/:code/status`
- `GET /api/schedules`
- `POST /api/schedules/create-next`
- `PATCH /api/schedules/:weekId/status`
- `PUT /api/schedules/:weekId/preferences/me`
- `POST|PUT|PATCH|DELETE /api/schedules/:weekId/assignments`
- `PUT /api/schedules/:weekId/forecast`

The access token is kept in memory. Sessions are restored with the HttpOnly
refresh cookie. Employee, shift, and schedule lists automatically load every
paginated API page after login. Schedule writes use backend versions; on
`VERSION_CONFLICT`, the store refetches schedules rather than applying an unsafe
optimistic update.

## Local development

Start the backend on port `3000`, then run:

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:3000`. For a separately hosted API, set:

```bash
VITE_API_BASE_URL=https://api.example.com
```

## Commands

| Command         | Purpose                  |
| --------------- | ------------------------ |
| `npm run dev`   | Start Vite development   |
| `npm run build` | Typecheck and build      |
| `npm run lint`  | Run ESLint               |
| `npm run test:smoke` | Check API/store integration smoke assertions |
| `npm run preview` | Preview production build |
