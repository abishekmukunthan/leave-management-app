import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedDatabase = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("\n❌ CRITICAL SAFETY ERROR: Refusing to execute seed data script in production environment.");
    console.error("Seeding deletes and resets existing user, profile, and team data. It is strictly prohibited in production.\n");
    if (process.env.VITEST !== "true") {
      process.exit(1);
    }
    throw new Error("Refusing to execute seed data script in production environment to prevent data loss.");
  }

  console.log("==================================================");
  console.log("Seeding Database with Demo Data (NON-PRODUCTION ONLY)");
  console.log("==================================================");

  const client = await pool.connect();
  try {
    const seedFile = "seed.sql";
    const seedPath = path.join(__dirname, seedFile);
    console.log(`\n--> Running seed script: ${seedFile}`);
    const seedSql = await fs.readFile(seedPath, "utf-8");
    
    await client.query(seedSql);
    console.log(`✓ Successfully applied seed data: ${seedFile}`);

    console.log("\n==================================================");
    console.log("Seeding completed successfully!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ Database seeding failed with error:", err.message);
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
  seedDatabase();
}

export default seedDatabase;
