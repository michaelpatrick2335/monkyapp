// Custom user-created breath exercises — stored in localStorage

import type { BreathChallenge } from "./breath-challenges";

const STORAGE_KEY = "monky_custom_breath_exercises";

export interface CustomBreathExercise {
  id: string;
  name: string;
  emoji: string;
  inhale: number;    // seconds
  holdIn: number;    // seconds (hold after inhale), 0 = skip
  exhale: number;    // seconds
  holdOut: number;   // seconds (hold after exhale), 0 = skip
  rounds: number;
  createdAt: number;
}

export function loadCustomExercises(): CustomBreathExercise[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCustomExercise(ex: Omit<CustomBreathExercise, "id" | "createdAt">): CustomBreathExercise {
  const exercises = loadCustomExercises();
  const newEx: CustomBreathExercise = {
    ...ex,
    id: `custom-${Date.now()}`,
    createdAt: Date.now(),
  };
  exercises.push(newEx);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises)); } catch {}
  return newEx;
}

export function updateCustomExercise(id: string, updates: Partial<Omit<CustomBreathExercise, "id" | "createdAt">>): void {
  const exercises = loadCustomExercises().map(e => e.id === id ? { ...e, ...updates } : e);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises)); } catch {}
}

export function deleteCustomExercise(id: string) {
  const exercises = loadCustomExercises().filter(e => e.id !== id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises)); } catch {}
}

// ── Per-exercise voice recordings (stored as base64 data URLs in localStorage)
const VOICE_KEY = (id: string, phase: string) => `monky_custom_voice_${id}_${phase}`;

export function saveExerciseVoice(exerciseId: string, phase: string, dataUrl: string) {
  try { localStorage.setItem(VOICE_KEY(exerciseId, phase), dataUrl); } catch {}
}

export function loadExerciseVoice(exerciseId: string, phase: string): string | null {
  try { return localStorage.getItem(VOICE_KEY(exerciseId, phase)); } catch { return null; }
}

export function deleteExerciseVoice(exerciseId: string, phase: string) {
  try { localStorage.removeItem(VOICE_KEY(exerciseId, phase)); } catch {}
}

export function playExerciseVoice(exerciseId: string, phase: string) {
  const dataUrl = loadExerciseVoice(exerciseId, phase);
  if (!dataUrl) return;
  try {
    const audio = new Audio(dataUrl);
    audio.volume = 1.0;
    audio.play().catch(() => {});
  } catch {}
}

// Convert a CustomBreathExercise to a BreathChallenge so BreathChallengeScreen can run it
export function toBreathChallenge(ex: CustomBreathExercise): BreathChallenge {
  const phases = [];
  phases.push({ label: "Inhale", count: ex.inhale, cue: "Breathe in…", color: "#4ade80" });
  if (ex.holdIn > 0) phases.push({ label: "Hold", count: ex.holdIn, cue: "Hold…", color: "#f5c842" });
  phases.push({ label: "Exhale", count: ex.exhale, cue: "Breathe out…", color: "#60a5fa" });
  if (ex.holdOut > 0) phases.push({ label: "Hold Empty", count: ex.holdOut, cue: "Rest empty…", color: "#a78bfa" });

  const pattern = [ex.inhale, ex.holdIn, ex.exhale, ex.holdOut].filter(v => v > 0).join("-");

  return {
    id: ex.id,
    name: ex.name,
    subtitle: `Custom · ${pattern}s · ${ex.rounds} rounds`,
    emoji: ex.emoji,
    bananaReward: 3,
    totalRounds: ex.rounds,
    phases,
    script: [
      "This is your custom breathing exercise.",
      "Follow the rhythm you set.",
      "Breathe with intention.",
      "Stay focused on the count.",
      "Each breath is a choice to be present.",
      "You created this practice for yourself.",
      "Honor it fully.",
    ],
    completionMessage: "Your custom practice is complete. Well done.",
  };
}
