# Backup, Restore, and Rollback

## Self-managed MongoDB

- Run backups from a host with network access to the replica set.
- Store dump files outside the application server and encrypt them at rest.
- Do not place credentials or dump archives in the repository.

Backup:

```bash
mongodump --uri "$MONGODB_URI" --db "$MONGODB_DB_NAME" --archive="backup-$(date -u +%Y%m%dT%H%M%SZ).archive" --gzip
```

Restore to a clean database:

```bash
mongorestore --uri "$MONGODB_URI" --nsInclude "$MONGODB_DB_NAME.*" --archive="backup.archive" --gzip --drop
```

## MongoDB Atlas

- Enable continuous cloud backups or scheduled snapshots before production traffic.
- Confirm restore permissions and test a point-in-time restore into a staging cluster.
- Keep Atlas project access limited to operators who need backup or restore rights.

## Deployment Rollback

1. Stop new deploy rollout and keep the last known-good image tag available.
2. If code rollback is enough, redeploy the previous image and verify `/api/ready`.
3. If a data migration must be rolled back, restore the last backup into a separate database first and compare documents.
4. Only run destructive restore with an approved outage window.
5. Re-run `npm run migrate`, `npm run indexes`, and smoke tests before reopening traffic.

## Data Migration Rules

- Migrations are idempotent and recorded in `schema_migrations`.
- Production deploys must run `npm run migrate`; do not rely on Mongoose `autoIndex`.
- A changed checksum for an already-applied migration is a no-go. Create a new migration instead.
