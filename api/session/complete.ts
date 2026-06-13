import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, updateUser, createSession, getCurrentEmail } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { durationSeconds } = req.body as { durationSeconds: number };
    const email = getCurrentEmail(req);
    const user = await getOrCreateUser(email);

    const session = await createSession({
      userId: user.id,
      level: user.level,
      tier: user.tier,
      durationSeconds,
      completedAt: new Date().toISOString(),
      bananasEarned: 1,
    });

    const today = new Date().toISOString().split("T")[0];
    const wasYesterday =
      user.lastSessionDate ===
      new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const isToday = user.lastSessionDate === today;

    const newBananas = user.bananas + 1;
    const newLevel = Math.min(user.level + 1, 1000);
    const newStreak = isToday
      ? user.streakDays
      : wasYesterday
      ? user.streakDays + 1
      : 1;

    let newTier = user.tier;
    if (newLevel >= 500) newTier = "enlightened";
    else if (newLevel >= 250) newTier = "experienced";

    const newFreeUsed = user.isPremium
      ? user.freeSessionsUsed
      : Math.min(user.freeSessionsUsed + 1, 3);

    const updatedUser = await updateUser(user.id, {
      level: newLevel,
      bananas: newBananas,
      totalSessions: user.totalSessions + 1,
      totalSecondsMediated: user.totalSecondsMediated + durationSeconds,
      streakDays: newStreak,
      lastSessionDate: today,
      tier: newTier,
      freeSessionsUsed: newFreeUsed,
    });

    return res.json({ session, user: updatedUser, leveledUp: newLevel !== user.level, newLevel });
  } catch (e: any) {
    console.error("/api/session/complete error:", e);
    return res.status(500).json({ error: e.message || "Failed to complete session" });
  }
}
