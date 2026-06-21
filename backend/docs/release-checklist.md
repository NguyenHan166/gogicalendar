# Release Checklist

## Go Criteria

- Authorization matches `docs/business-rules.md` section 11.
- Audit logs are written for auth, employee, shift, schedule status, preference override, assignment, and forecast changes.
- `/api/audit-logs` works for managers with pagination and filters, and is denied to employees/anonymous users.
- Production config uses `NODE_ENV=production`, trusted proxy, secure refresh cookies, and no committed secrets.
- Docker image builds from `backend/Dockerfile`; sample production compose uses healthchecks.
- `npm run migrate` and `npm run indexes` complete against the target MongoDB database.
- Backups are enabled and a restore procedure has been tested.
- CI passes: install, lint, typecheck, tests, and build.
- `npm audit` has no unresolved high/critical issue with a safe fix available.
- Coverage and high-risk business-rule tests pass.
- API smoke test passes on a clean MongoDB replica set with minimal seed data.

## No-Go Criteria

- Any required secret is missing or committed to git.
- Migration/index deployment has not been run on the target database.
- Tests, build, or smoke test fail.
- Audit log writes fail for manager mutations.
- Rollback backup is missing or restore has not been tested for the release window.

## Commands

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run test:smoke
npm run build
npm audit
npm run migrate
npm run indexes
```
