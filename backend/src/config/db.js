import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Configure pg type parser for DATE (OID 1082) to return plain string YYYY-MM-DD
// without JavaScript Date / UTC timezone conversion
pg.types.setTypeParser(1082, (value) => value);

const { Pool } = pg;

const getDatabaseSslConfig = () => {
  if (process.env.DB_SSL === "false" || process.env.DB_SSL === "disable") {
    return false;
  }
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.includes("sslmode=disable")) {
      return false;
    }
    return { rejectUnauthorized: false };
  }
  if (process.env.DB_SSL === "true" || process.env.DB_SSL === "require") {
    return { rejectUnauthorized: false };
  }
  return false;
};

const sslConfig = getDatabaseSslConfig();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ...(sslConfig ? { ssl: sslConfig } : {}),
    }
  : {
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "leave_management",
      password: process.env.DB_PASSWORD || "postgres",
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      ...(sslConfig ? { ssl: sslConfig } : {}),
    };

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

export default pool;
