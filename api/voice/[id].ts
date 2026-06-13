// GET  /api/voice/:id  — stream a voice cue
// POST /api/voice/:id  — upload a voice cue
// DELETE /api/voice/:id — delete a voice cue

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put, list, del } from "@vercel/blob";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-email");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const id = req.query.id as string;

  try {
    if (req.method === "GET") {
      const { blobs } = await list({ prefix: `voice-cues/${id}.` });
      if (blobs.length === 0) return res.status(404).end();
      // Redirect to blob URL
      res.setHeader("Location", blobs[0].url);
      return res.status(302).end();
    }

    if (req.method === "POST") {
      // Read raw body
      const chunks: Buffer[] = [];
      for await (const chunk of req as any) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      // Try to detect extension from content-type
      const ct = req.headers["content-type"] || "audio/mpeg";
      const ext = ct.includes("wav") ? ".wav" : ct.includes("ogg") ? ".ogg" : ".mp3";
      const blob = await put(`voice-cues/${id}${ext}`, buffer, {
        access: "public",
        contentType: ct,
      });
      return res.json({ ok: true, id, url: blob.url });
    }

    if (req.method === "DELETE") {
      const { blobs } = await list({ prefix: `voice-cues/${id}.` });
      for (const blob of blobs) await del(blob.url);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error(`/api/voice/${id} error:`, e);
    return res.status(500).json({ error: e.message });
  }
}
