import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILES = [
  "schema.sql",
  "auth_user_management_migration.sql",
  "team_workflow_migration.sql",
  "configuration_management_migration.sql",
  "permission_management_migration.sql",
  "paycut_leave_migration.sql",
];

const runMigrations = async () => {
  console.log("==================================================");
  console.log("Starting Database Migration for Leave Management App");
  console.log("==================================================");

  const client = await pool.connect();
  try {
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(__dirname, file);
      console.log(`\n--> Running migration file: ${file}`);
      const sql = await fs.readFile(filePath, "utf-8");
      
      // Execute migration
      await client.query(sql);
      console.log(`✓ Successfully applied: ${file}`);
    }

    // Optional seed data if --seed flag or SEED_DATABASE=true is set
    const shouldSeed = process.argv.includes("--seed") || process.env.SEED_DATABASE === "true";
    if (shouldSeed) {
      const seedFile = "seed.sql";
      const seedPath = path.join(__dirname, seedFile);
      console.log(`\n--> Seeding initial demo data: ${seedFile}`);
      const seedSql = await fs.readFile(seedPath, "utf-8");
      await client.query(seedSql);
      console.log(`✓ Successfully applied seed: ${seedFile}`);
    }

    console.log("\n==================================================");
    console.log("All migrations completed successfully!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ Migration failed with error:", err.message);
    if (err.position) {
      console.error(`Position: ${err.position}`);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigrations();
