import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, updateUser, getCurrentEmail } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const email = getCurrentEmail(req);
    const user = await getOrCreateUser(email);
    // Reset to fresh state — keeps the user row but wipes progress
    const reset = await updateUser(user.id, {
      name: "Seeker",
      tier: "newbie",
      level: 1,
      bananas: 0,
      totalSessions: 0,
      totalSecondsMediated: 0,
      streakDays: 0,
      lastSessionDate: null as any,
      isPremium: false,
      freeSessionsUsed: 0,
    });
    return res.json(reset);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to logout" });
  }
}
