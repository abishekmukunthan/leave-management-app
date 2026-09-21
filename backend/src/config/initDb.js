import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeDatabase = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("\n❌ CRITICAL SAFETY ERROR: Refusing to run destructive database initialization in production.");
    console.error("Database initialization drops and recreates core tables. It is strictly prohibited in production environments.\n");
    if (process.env.VITEST !== "true") {
      process.exit(1);
    }
    throw new Error("Refusing to run destructive database initialization in production.");
  }

  console.log("==================================================");
  console.log("Initializing Fresh Database (NON-PRODUCTION ONLY)");
  console.log("==================================================");

  const client = await pool.connect();
  try {
    const schemaFile = "initial_schema.sql";
    const schemaPath = path.join(__dirname, schemaFile);
    console.log(`\n--> Executing initial schema creation: ${schemaFile}`);
    const sql = await fs.readFile(schemaPath, "utf-8");
    
    await client.query(sql);
    console.log(`✓ Successfully initialized core database tables from ${schemaFile}`);

    // Create schema_migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ Ensured schema_migrations tracking table exists");

    console.log("\n==================================================");
    console.log("Database initialization completed successfully!");
    console.log("You can now run 'npm run migrate' to apply any incremental migrations.");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ Database initialization failed with error:", err.message);
    if (process.env.VITEST !== "true") {
      process.exit(1);
    }
    throw err;
  } finally {
    client.release();
    if (process.env.VITEST !== "true") {
      await pool.end();
    }
  }
};

// If run directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  initializeDatabase();
}

export default initializeDatabase;
