import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  const info: any = {
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.substring(0, 40) + "...)" : "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
    },
    node: process.version,
    time: new Date().toISOString(),
  };

  try {
    const { Pool } = await import("pg");
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
    
    // Test CREATE TABLE
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE,
          name TEXT NOT NULL DEFAULT 'Seeker',
          tier TEXT NOT NULL DEFAULT 'newbie',
          level INTEGER NOT NULL DEFAULT 1,
          bananas INTEGER NOT NULL DEFAULT 0,
          total_sessions INTEGER NOT NULL DEFAULT 0,
          total_seconds_meditated INTEGER NOT NULL DEFAULT 0,
          streak_days INTEGER NOT NULL DEFAULT 0,
          last_session_date TEXT,
          is_premium BOOLEAN NOT NULL DEFAULT FALSE,
          free_sessions_used INTEGER NOT NULL DEFAULT 0,
          profile_pic TEXT,
          active_music_track TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      info.create_table = "ok";
    } catch (e: any) {
      info.create_table_error = e.message;
    }

    // Test INSERT
    try {
      const r = await pool.query(
        `INSERT INTO users (email, name) VALUES ($1, 'Seeker')
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
         RETURNING *`,
        ["mdore06@gmail.com"]
      );
      info.insert = "ok: " + JSON.stringify(r.rows[0]).substring(0, 100);
    } catch (e: any) {
      info.insert_error = e.message;
    }

    await pool.end();
  } catch (e: any) {
    info.fatal_error = e.message;
    info.stack = e.stack?.substring(0, 500);
  }

  return res.json(info);
}
