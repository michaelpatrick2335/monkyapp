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

export function deleteCustomExercise(id: string) {
  const exercises = loadCustomExercises().filter(e => e.id !== id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises)); } catch {}
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
