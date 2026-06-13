import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, getSessions, getCurrentEmail } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const email = getCurrentEmail(req);
    const user = await getOrCreateUser(email);
    const sessions = await getSessions(user.id);
    return res.json(sessions);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to get sessions" });
  }
}
