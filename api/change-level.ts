import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, updateUser, getCurrentEmail } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { tier } = req.body as { tier: string };
    const tierStartLevel: Record<string, number> = {
      newbie: 1,
      experienced: 250,
      enlightened: 500,
    };
    const newLevel = tierStartLevel[tier];
    if (!newLevel) return res.status(400).json({ error: "Invalid tier" });

    const email = getCurrentEmail(req);
    const user = await getOrCreateUser(email);
    const updated = await updateUser(user.id, { tier, level: newLevel });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to change level" });
  }
}
