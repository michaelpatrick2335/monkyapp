import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makePool, ensureTables, rowToUser, getOrCreateUser, updateUser, getEmail, cors } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const pool = makePool();
  try {
    await ensureTables(pool);
    const email = getEmail(req.headers as any);
    const userRow = await getOrCreateUser(pool, email);
    const reset = await updateUser(pool, userRow.id, {
      name: "Seeker", tier: "newbie", level: 1, bananas: 0,
      totalSessions: 0, totalSecondsMediated: 0, streakDays: 0,
      lastSessionDate: null, isPremium: false, freeSessionsUsed: 0,
    });
    return res.json(rowToUser(reset));
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally { await pool.end(); }
}
