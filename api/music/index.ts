// GET  /api/music  — list tracks
// POST /api/music  — upload track

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put, list } from "@vercel/blob";
import { getOrCreateUser, getCurrentEmail } from "../_db";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const { blobs } = await list({ prefix: "meditation-music/" });
      const tracks = blobs
        .filter(b => !b.pathname.endsWith(".json"))
        .map(b => {
          const parts = b.pathname.split("/");
          const filename = parts[parts.length - 1];
          const id = filename.replace(/\.[^.]+$/, "");
          return { id, name: id, url: b.url, size: b.size };
        });
      const email = getCurrentEmail(req);
      const user = await getOrCreateUser(email);
      return res.json({ tracks, active: user.activeMusicTrack ?? null });
    }

    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of req as any) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const ct = req.headers["content-type"] || "audio/mpeg";
      const id = `track_${Date.now()}`;
      const ext = ct.includes("wav") ? ".wav" : ct.includes("ogg") ? ".ogg" : ".mp3";
      const blob = await put(`meditation-music/${id}${ext}`, buffer, {
        access: "public",
        contentType: ct,
      });
      return res.json({ id, name: id, url: blob.url });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/music error:", e);
    return res.status(500).json({ error: e.message });
  }
}
