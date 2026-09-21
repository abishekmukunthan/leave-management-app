# Production Database Migrations & Backup Guide

This document defines the strict operational procedures and safeguards for running database migrations against production and non-production environments.

---

## 1. Architecture Overview & Safety Rules

### Crucial Distinction: Initialization vs Incremental Migrations
| Command | Target Environment | Purpose | Destructive? | Safety Guard |
| :--- | :--- | :--- | :--- | :--- |
| `npm run migrate` | Production & Local | Executes pending incremental SQL migrations tracked in `schema_migrations`. | **No** | Executes unapplied migrations only inside transactions. Never drops tables. |
| `npm run db:init` | Local / Test Only | Bootstraps a fresh, empty database using `initial_schema.sql`. | **Yes (DROPS tables)** | **Hard Blocked** in `NODE_ENV === "production"`. |
| `npm run db:seed` | Local / Test Only | Seeds demo accounts and test records via `seed.sql`. | **Yes (DELETES users)**| **Hard Blocked** in `NODE_ENV === "production"`. |

---

## 2. Standard Production Migration Workflow

Whenever a new schema migration is required:

### Step 1: Create an Incremental Migration File
- Place the migration in `backend/src/config/`.
- Ensure all SQL statements are **idempotent** and **non-destructive**:
  - Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
  - Use `CREATE TABLE IF NOT EXISTS ...`
  - Use `DROP CONSTRAINT IF EXISTS ...` before adding constraints.
  - **NEVER** include `DROP TABLE`, `TRUNCATE`, or `DELETE FROM users`.
- Add the migration file name to `INCREMENTAL_MIGRATION_FILES` in `backend/src/config/runMigrations.js`.

### Step 2: Create a Database Backup (Supabase)
Before applying any migration to production:
1. Open the **Supabase Dashboard** for your project.
2. Navigate to **Database** -> **Backups**.
3. Trigger a manual backup or export a dump via `pg_dump`:
   ```bash
   pg_dump -d "$DATABASE_URL" -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump
   ```
4. Verify the backup file was generated successfully.

### Step 3: Run the Safe Migration Command
From the `backend` directory, run:
```bash
npm run migrate
```
- The migration runner will:
  1. Ensure the `schema_migrations` tracking table exists.
  2. Read previously applied migrations.
  3. Skip all previously executed migrations.
  4. Run only the pending migration(s) inside an atomic transaction (`BEGIN` ... `COMMIT`).
  5. If an error occurs, execute `ROLLBACK` immediately so no partial state or corrupted tracking occurs.

### Step 4: Verify Post-Migration
1. Verify console output:
   ```text
   [SKIPPED] Already applied: auth_user_management_migration.sql
   [SKIPPED] Already applied: team_workflow_migration.sql
   ...
   --> Running pending migration: new_feature_migration.sql
   ✓ Successfully applied: new_feature_migration.sql
   Migration Summary: 1 applied, 6 skipped.
   ```
2. Verify production tables and users remain intact.

---

## 3. Migration Tracking Table (`schema_migrations`)

The `schema_migrations` table records all successfully applied migrations:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

To view applied migrations in PostgreSQL / Supabase SQL Editor:
```sql
SELECT * FROM schema_migrations ORDER BY id ASC;
```

---

## 4. Troubleshooting & FAQ

### Q: Why did the database get wiped previously?
- Previously, `runMigrations.js` included `schema.sql` at the head of its execution list.
- `schema.sql` contained `DROP TABLE IF EXISTS ... CASCADE` for all core tables.
- Each execution of `npm run migrate` re-ran `schema.sql`, dropping existing data.

### Q: What prevents this now?
1. `schema.sql` was renamed to `initial_schema.sql` and removed from `INCREMENTAL_MIGRATION_FILES`.
2. `initial_schema.sql` is only executed via `npm run db:init`, which immediately aborts with an error if `NODE_ENV === "production"`.
3. `npm run migrate` only runs incremental migrations tracked via `schema_migrations`.
4. Seeding is hard-blocked when running in a production environment.
