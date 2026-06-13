import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  const allEnvKeys = Object.keys(process.env).filter(k => 
    k.includes("POSTGRES") || k.includes("DATABASE") || k.includes("PG") || k.includes("NEON")
  );

  const info: any = {
    relevantEnvKeys: allEnvKeys,
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
    POSTGRES_URL: process.env.POSTGRES_URL ? "SET" : "NOT SET",
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? "SET" : "NOT SET",
    node: process.version,
    time: new Date().toISOString(),
  };

  // Test pg (which works in debug)
  try {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
    const r = await pool.query("SELECT COUNT(*) as n FROM users");
    info.pg_users_count = r.rows[0].n;
    await pool.end();
    info.pg_status = "ok";
  } catch (e: any) {
    info.pg_error = e.message;
  }

  // Test @vercel/postgres
  try {
    const { sql } = await import("@vercel/postgres");
    const r = await sql`SELECT COUNT(*) as n FROM users`;
    info.vercel_postgres_users = r.rows[0].n;
    info.vercel_postgres_status = "ok";
  } catch (e: any) {
    info.vercel_postgres_error = e.message;
  }

  return res.json(info);
}
