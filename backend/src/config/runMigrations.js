import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ordered list of SAFE, INCREMENTAL migrations only.
// NEVER include initial_schema.sql or any destructive scripts here.
export const INCREMENTAL_MIGRATION_FILES = [
  "auth_user_management_migration.sql",
  "team_workflow_migration.sql",
  "configuration_management_migration.sql",
  "permission_management_migration.sql",
  "paycut_leave_migration.sql",
  "time_permission_time_range_migration.sql",
  "fix_priyadharshini_membership.sql",
];

export const runMigrations = async (customPool = pool) => {
  console.log("==================================================");
  console.log("Starting Safe Incremental Database Migrations");
  console.log("==================================================");

  const client = await customPool.connect();
  try {
    // 1. Ensure schema_migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch already applied migrations
    const appliedResult = await client.query("SELECT migration_name FROM schema_migrations");
    const appliedSet = new Set(appliedResult.rows.map((row) => row.migration_name));

    let appliedCount = 0;
    let skippedCount = 0;

    // 3. Process each incremental migration file in order
    for (const file of INCREMENTAL_MIGRATION_FILES) {
      if (appliedSet.has(file)) {
        console.log(`[SKIPPED] Already applied: ${file}`);
        skippedCount++;
        continue;
      }

      console.log(`\n--> Running pending migration: ${file}`);
      const filePath = path.join(__dirname, file);
      const sql = await fs.readFile(filePath, "utf-8");

      // Execute migration within a dedicated transaction
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`✓ Successfully applied: ${file}`);
        appliedCount++;
      } catch (migrationErr) {
        await client.query("ROLLBACK");
        console.error(`\n❌ Error executing migration ${file}:`, migrationErr.message);
        throw migrationErr;
      }
    }

    // 4. Optional seed handling with hard production check
    const shouldSeed = process.argv.includes("--seed") || process.env.SEED_DATABASE === "true";
    if (shouldSeed) {
      if (process.env.NODE_ENV === "production") {
        console.warn("\n⚠️ WARNING: Database seeding was requested (--seed) but is BLOCKED in production environment.");
        console.warn("Seeding is strictly prohibited in production to prevent data loss.\n");
      } else {
        const seedFile = "seed.sql";
        const seedPath = path.join(__dirname, seedFile);
        console.log(`\n--> Seeding initial demo data: ${seedFile}`);
        const seedSql = await fs.readFile(seedPath, "utf-8");
        await client.query(seedSql);
        console.log(`✓ Successfully applied seed: ${seedFile}`);
      }
    }

    console.log("\n==================================================");
    console.log(`Migration Summary: ${appliedCount} applied, ${skippedCount} skipped.`);
    console.log("All migrations processed successfully!");
    console.log("==================================================");

    return { appliedCount, skippedCount };
  } catch (err) {
    console.error("\n❌ Migration process aborted with error:", err.message);
    if (err.position) {
      console.error(`Position: ${err.position}`);
    }
    if (process.env.VITEST !== "true") {
      process.exit(1);
    }
    throw err;
  } finally {
    client.release();
    if (process.env.VITEST !== "true" && customPool === pool) {
      await pool.end();
    }
  }
};

// If run directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations();
}

export default runMigrations;
