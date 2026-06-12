// Built-in meditation tracks — served from /api/builtin-tracks/:id

export interface BuiltinTrack {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export const BUILTIN_TRACKS: BuiltinTrack[] = [
  { id: "nature",        name: "Nature",         emoji: "🌿", desc: "Peaceful nature sounds" },
  { id: "relax-breathe", name: "Relax & Breathe", emoji: "🌬️", desc: "Calming breathwork music" },
  { id: "healing",       name: "Healing",         emoji: "✨", desc: "Deep healing frequencies" },
  { id: "bliss",         name: "Bliss",           emoji: "☁️", desc: "Serene blissful ambience" },
  { id: "om-chants",     name: "Om Chants",       emoji: "🕉️", desc: "Sacred om chanting" },
];

/** Returns the proxy-aware URL for a built-in track */
export function getBuiltinTrackUrl(id: string): string {
  const API_BASE = ("__PORT_5000__" as string).startsWith("__") ? "" : "__PORT_5000__";
  return `${API_BASE}/api/builtin-tracks/${id}`;
}
