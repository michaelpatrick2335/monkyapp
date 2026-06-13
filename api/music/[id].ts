// GET    /api/music/:id  — redirect to blob URL
// DELETE /api/music/:id  — delete track

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { list, del } from "@vercel/blob";
import { getOrCreateUser, updateUser, getCurrentEmail } from "../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const id = req.query.id as string;

  try {
    if (req.method === "GET") {
      const { blobs } = await list({ prefix: `meditation-music/${id}.` });
      if (blobs.length === 0) return res.status(404).json({ error: "Track not found" });
      res.setHeader("Location", blobs[0].url);
      return res.status(302).end();
    }

    if (req.method === "DELETE") {
      const { blobs } = await list({ prefix: `meditation-music/${id}.` });
      for (const blob of blobs) await del(blob.url);
      const email = getCurrentEmail(req);
      const user = await getOrCreateUser(email);
      if (user.activeMusicTrack === id) {
        await updateUser(user.id, { activeMusicTrack: null as any });
      }
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
