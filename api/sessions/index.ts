import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE, name TEXT NOT NULL DEFAULT 'Seeker',
        tier TEXT NOT NULL DEFAULT 'newbie', level INTEGER NOT NULL DEFAULT 1,
        bananas INTEGER NOT NULL DEFAULT 0, total_sessions INTEGER NOT NULL DEFAULT 0,
        total_seconds_meditated INTEGER NOT NULL DEFAULT 0, streak_days INTEGER NOT NULL DEFAULT 0,
        last_session_date TEXT, is_premium BOOLEAN NOT NULL DEFAULT FALSE,
        free_sessions_used INTEGER NOT NULL DEFAULT 0, profile_pic TEXT,
        active_music_track TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS meditation_sessions (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, level INTEGER NOT NULL,
        tier TEXT NOT NULL, duration_seconds INTEGER NOT NULL, completed_at TEXT NOT NULL,
        bananas_earned INTEGER NOT NULL DEFAULT 1
      );
    `);

    const raw = req.headers["x-user-email"];
    const email = ((Array.isArray(raw) ? raw[0] : raw) || "").trim().toLowerCase() || null;

    let userId: number;
    if (email) {
      const r = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (r.rows.length === 0) return res.json([]);
      userId = r.rows[0].id;
    } else {
      const r = await pool.query("SELECT id FROM users WHERE email IS NULL ORDER BY id LIMIT 1");
      if (r.rows.length === 0) return res.json([]);
      userId = r.rows[0].id;
    }

    const r = await pool.query(
      "SELECT * FROM meditation_sessions WHERE user_id = $1 ORDER BY completed_at DESC",
      [userId]
    );
    return res.json(r.rows.map((row: any) => ({
      id: row.id, userId: row.user_id, level: row.level, tier: row.tier,
      durationSeconds: row.duration_seconds, completedAt: row.completed_at,
      bananasEarned: row.bananas_earned,
    })));
  } catch (e: any) {
    return res.status(500).json({ error: e.message, stack: e.stack?.substring(0, 300) });
  } finally {
    await pool.end();
  }
}
