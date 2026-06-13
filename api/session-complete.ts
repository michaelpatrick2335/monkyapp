import type { VercelRequest, VercelResponse } from "@vercel/node";
import { makePool, ensureTables, rowToUser, getOrCreateUser, updateUser, getEmail, cors } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const pool = makePool();
  try {
    await ensureTables(pool);
    const { durationSeconds } = req.body as { durationSeconds: number };
    const email = getEmail(req.headers as any);
    const userRow = await getOrCreateUser(pool, email);
    const user = rowToUser(userRow);

    const sessionRes = await pool.query(
      `INSERT INTO meditation_sessions (user_id, level, tier, duration_seconds, completed_at, bananas_earned)
       VALUES ($1, $2, $3, $4, $5, 1) RETURNING *`,
      [user.id, user.level, user.tier, durationSeconds, new Date().toISOString()]
    );
    const session = sessionRes.rows[0];

    const today = new Date().toISOString().split("T")[0];
    const wasYesterday = user.lastSessionDate === new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const isToday = user.lastSessionDate === today;
    const newBananas = user.bananas + 1;
    const newLevel = Math.min(user.level + 1, 1000);
    const newStreak = isToday ? user.streakDays : wasYesterday ? user.streakDays + 1 : 1;
    let newTier = user.tier;
    if (newLevel >= 500) newTier = "enlightened";
    else if (newLevel >= 250) newTier = "experienced";
    const newFreeUsed = user.isPremium ? user.freeSessionsUsed : Math.min(user.freeSessionsUsed + 1, 3);

    const updatedRow = await updateUser(pool, user.id, {
      level: newLevel, bananas: newBananas,
      totalSessions: user.totalSessions + 1,
      totalSecondsMediated: user.totalSecondsMediated + durationSeconds,
      streakDays: newStreak, lastSessionDate: today, tier: newTier, freeSessionsUsed: newFreeUsed,
    });
    return res.json({ session, user: rowToUser(updatedRow), leveledUp: newLevel !== user.level, newLevel });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally { await pool.end(); }
}
