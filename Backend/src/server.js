import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import pool from "./config/db.js";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import investigationRoutes from "./routes/investigationRoutes.js";
import entityRoutes from "./routes/entityRoutes.js";
import evidenceRoutes from "./routes/evidenceRoutes.js";
import signalRoutes from "./routes/signalRoutes.js";
import relationshipRoutes from "./routes/relationshipRoutes.js";
import trendRoutes from "./routes/trendRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ message: "TRACE-X API is running" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ success: true, message: "PostgreSQL connected successfully", time: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/investigations", investigationRoutes);
app.use("/api/entities", entityRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/records", signalRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/trends", trendRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = env.port;
app.listen(PORT, () => {
  console.log(`🚀 TRACE-X backend running on port ${PORT}`);
});