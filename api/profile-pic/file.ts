import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateUser, getCurrentEmail } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const email = getCurrentEmail(req);
    const user = await getOrCreateUser(email);
    if (!user.profilePic) return res.status(404).json({ error: "No profile pic" });
    res.setHeader("Location", user.profilePic);
    return res.status(302).end();
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
