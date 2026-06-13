import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  const info: any = {
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.substring(0, 30) + "...)" : "NOT SET",
      POSTGRES_URL: process.env.POSTGRES_URL ? "SET (" + process.env.POSTGRES_URL.substring(0, 30) + "...)" : "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
    },
    node: process.version,
    time: new Date().toISOString(),
  };

  // Try to import pg
  try {
    const { Pool } = await import("pg");
    info.pg = "imported ok";
    
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (url) {
      const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
      const result = await pool.query("SELECT 1 as ok");
      info.db = "connected: " + JSON.stringify(result.rows[0]);
      await pool.end();
    } else {
      info.db = "skipped - no URL";
    }
  } catch (e: any) {
    info.pg_error = e.message;
  }

  return res.json(info);
}
