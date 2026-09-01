import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import substituteRoutes from "./routes/substituteRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.json({
    message: "Leave Management API is running",
  });
});

// Database connection test route
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);
    res.status(500).json({
      error: error.message,
    });
  }
});

// Mount API routes
app.use("/api/leaves", leaveRoutes);
app.use("/api/substitute-requests", substituteRoutes);
app.use("/api/admin", adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

export default app;