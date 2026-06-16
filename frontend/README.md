# GogiCalendar Frontend

React, TypeScript, Zustand, Tailwind CSS, and Vite frontend for GogiCalendar.

## Backend integration

Authentication, employee, and shift-code screens use the Express API:

- `POST /api/auth/login/manager`
- `POST /api/auth/login/employee`
- `POST /api/auth/refresh`
- `GET /api/employees`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `PATCH /api/employees/:id/status`
- `GET /api/shifts`
- `POST /api/shifts`
- `PUT /api/shifts/:code`
- `PATCH /api/shifts/:code/status`

The access token is kept in memory. Sessions are restored with the HttpOnly
refresh cookie. Employee and shift lists automatically load every paginated API
page after login.

Schedule, assignment, preference, and forecast data remain local mock data until
their backend phases are implemented.

## Local development

Start the backend on port `3000`, then run:

```bash
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
| `npm run preview` | Preview production build |
