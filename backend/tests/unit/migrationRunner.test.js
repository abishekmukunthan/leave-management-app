import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runMigrations, INCREMENTAL_MIGRATION_FILES } from "../../src/config/runMigrations.js";
import { initializeDatabase } from "../../src/config/initDb.js";
import { seedDatabase } from "../../src/config/seedDb.js";

describe("Database Migration Safety & Tracking System", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalVitest = process.env.VITEST;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITEST = "true";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.VITEST = originalVitest;
  });

  it("1. INCREMENTAL_MIGRATION_FILES must NOT include initial_schema.sql or schema.sql", () => {
    expect(INCREMENTAL_MIGRATION_FILES).not.toContain("schema.sql");
    expect(INCREMENTAL_MIGRATION_FILES).not.toContain("initial_schema.sql");
    expect(INCREMENTAL_MIGRATION_FILES).not.toContain("seed.sql");
    
    // Verify all listed migrations are safe incremental SQL files
    INCREMENTAL_MIGRATION_FILES.forEach((file) => {
      expect(file).toMatch(/\.sql$/);
    });
  });

  it("2. Creates schema_migrations table and skips already applied migrations", async () => {
    const executedQueries = [];
    const mockClient = {
      query: vi.fn(async (sql, params) => {
        executedQueries.push({ sql, params });
        if (typeof sql === "string" && sql.includes("SELECT migration_name FROM schema_migrations")) {
          // Simulate all migrations already applied
          return {
            rows: INCREMENTAL_MIGRATION_FILES.map((name) => ({ migration_name: name })),
          };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    };

    const result = await runMigrations(mockPool);

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS schema_migrations")
    );
    expect(result.appliedCount).toBe(0);
    expect(result.skippedCount).toBe(INCREMENTAL_MIGRATION_FILES.length);
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("3. Executes pending migrations in transaction and records them in schema_migrations", async () => {
    const executedQueries = [];
    const mockClient = {
      query: vi.fn(async (sql, params) => {
        executedQueries.push({ sql, params });
        if (typeof sql === "string" && sql.includes("SELECT migration_name FROM schema_migrations")) {
          // Only first 2 are applied, rest are pending
          return {
            rows: [
              { migration_name: INCREMENTAL_MIGRATION_FILES[0] },
              { migration_name: INCREMENTAL_MIGRATION_FILES[1] },
            ],
          };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    };

    const result = await runMigrations(mockPool);

    const pendingCount = INCREMENTAL_MIGRATION_FILES.length - 2;
    expect(result.appliedCount).toBe(pendingCount);
    expect(result.skippedCount).toBe(2);

    // Verify BEGIN, INSERT INTO schema_migrations, and COMMIT were called for each pending migration
    const beginCalls = executedQueries.filter((q) => q.sql === "BEGIN").length;
    const commitCalls = executedQueries.filter((q) => q.sql === "COMMIT").length;
    const insertCalls = executedQueries.filter(
      (q) => typeof q.sql === "string" && q.sql.includes("INSERT INTO schema_migrations")
    ).length;

    expect(beginCalls).toBe(pendingCount);
    expect(commitCalls).toBe(pendingCount);
    expect(insertCalls).toBe(pendingCount);
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("4. Rolls back transaction and does NOT record migration on failure", async () => {
    let callCount = 0;
    const mockClient = {
      query: vi.fn(async (sql, params) => {
        if (typeof sql === "string" && sql.includes("SELECT migration_name FROM schema_migrations")) {
          return { rows: [] }; // All pending
        }
        if (sql === "BEGIN") {
          return { rows: [] };
        }
        callCount++;
        // Throw error on the first migration execution
        if (callCount === 3) {
          throw new Error("Syntax error in SQL migration");
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    };

    await expect(runMigrations(mockPool)).rejects.toThrow("Syntax error in SQL migration");

    expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("5. Production guard: initDb.js aborts immediately when NODE_ENV is production", async () => {
    process.env.NODE_ENV = "production";

    await expect(initializeDatabase()).rejects.toThrow(
      "Refusing to run destructive database initialization in production."
    );
  });

  it("6. Production guard: seedDb.js aborts immediately when NODE_ENV is production", async () => {
    process.env.NODE_ENV = "production";

    await expect(seedDatabase()).rejects.toThrow(
      "Refusing to execute seed data script in production environment to prevent data loss."
    );
  });

  it("7. Production guard: runMigrations.js with --seed does NOT execute seed in production", async () => {
    process.env.NODE_ENV = "production";
    const originalArgv = process.argv;
    process.argv = [...originalArgv, "--seed"];

    const mockClient = {
      query: vi.fn(async (sql) => {
        if (typeof sql === "string" && sql.includes("SELECT migration_name FROM schema_migrations")) {
          return {
            rows: INCREMENTAL_MIGRATION_FILES.map((name) => ({ migration_name: name })),
          };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    };

    const result = await runMigrations(mockPool);
    expect(result.skippedCount).toBe(INCREMENTAL_MIGRATION_FILES.length);

    // Verify seed.sql was NOT executed
    const seedExecution = mockClient.query.mock.calls.some(([sql]) =>
      typeof sql === "string" && sql.includes("DELETE FROM users")
    );
    expect(seedExecution).toBe(false);

    process.argv = originalArgv;
  });
});
