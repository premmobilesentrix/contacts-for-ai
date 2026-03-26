import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import contactsRouter from "./routes/contacts";
import { pool } from "./db";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();

async function runMigrations() {
  const sqlPath = path.join(__dirname, "../sql/init.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log("📦 Running DB migrations...");
  await pool.query(sql);
  console.log("✅ Migrations complete");
}

function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.hostname === "0.0.0.0") url.hostname = "localhost";
    return url.origin;
  } catch {
    return origin;
  }
}

const corsOriginEnv = process.env.CORS_ORIGIN ?? "*";
const allowAllOrigins = corsOriginEnv.trim() === "*";

const allowedOrigins = allowAllOrigins
  ? []
  : corsOriginEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(normalizeOrigin);

app.use(
  cors({
    origin(origin, callback) {
      if (allowAllOrigins) return callback(null, true);

      // allow non-browser clients (curl, healthchecks, etc.)
      if (!origin) return callback(null, true);

      const normalized = normalizeOrigin(origin);

      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      console.error("❌ CORS blocked:", origin);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // future-proof (cookies, auth)
  }),
);
app.use(express.json());

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/api/contacts", contactsRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    res.status(500).json({ error: message });
  },
);

const port = Number(process.env.PORT ?? 4000);
async function start() {
  try {
    await runMigrations();

    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
      console.log(`CORS origin(s): ${corsOriginEnv}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();

