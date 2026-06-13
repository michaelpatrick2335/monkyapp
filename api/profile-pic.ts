// POST   /api/profile-pic       — upload profile picture
// GET    /api/profile-pic/file  — redirect to blob URL
// DELETE /api/profile-pic       — delete profile picture

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put, list, del } from "@vercel/blob";
import { getOrCreateUser, updateUser, getCurrentEmail } from "./_db";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const email = getCurrentEmail(req);

  try {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of req as any) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const ct = req.headers["content-type"] || "image/jpeg";
      const ext = ct.includes("png") ? ".png" : ct.includes("gif") ? ".gif" : ct.includes("webp") ? ".webp" : ".jpg";
      const key = email ? `profile-pics/${email.replace(/[^a-z0-9]/g, "_")}${ext}` : `profile-pics/anon${ext}`;
      const blob = await put(key, buffer, { access: "public", contentType: ct });
      const user = await getOrCreateUser(email);
      const updated = await updateUser(user.id, { profilePic: blob.url });
      return res.json({ url: blob.url, user: updated });
    }

    if (req.method === "GET") {
      // /api/profile-pic/file — redirect to stored URL
      const user = await getOrCreateUser(email);
      if (!user.profilePic) return res.status(404).json({ error: "No profile pic" });
      res.setHeader("Location", user.profilePic);
      return res.status(302).end();
    }

    if (req.method === "DELETE") {
      const user = await getOrCreateUser(email);
      if (user.profilePic) {
        try { await del(user.profilePic); } catch {}
      }
      const updated = await updateUser(user.id, { profilePic: null as any });
      return res.json({ user: updated });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/profile-pic error:", e);
    return res.status(500).json({ error: e.message });
  }
}
