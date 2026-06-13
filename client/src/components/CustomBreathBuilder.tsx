import { useState } from "react";
import { saveCustomExercise, loadCustomExercises, deleteCustomExercise, type CustomBreathExercise } from "@/lib/custom-breath-exercises";

const EMOJIS = ["🌬️","🔷","🌀","🌊","🔥","⭐","🌙","🏔️","🌿","💎","🕉️","✨"];

function StepPicker({ label, value, onChange, min = 0, max = 20 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
      <div>
        <p className="font-display font-bold text-sm" style={{ color: "var(--foreground)" }}>{label}</p>
        {min === 0 && <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>0 = skip this phase</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.1)", color: "var(--foreground)" }}
        >−</button>
        <span className="font-display font-bold text-base w-8 text-center" style={{ color: "var(--color-gold)" }}>
          {value === 0 ? "—" : `${value}s`}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.1)", color: "var(--foreground)" }}
        >+</button>
      </div>
    </div>
  );
}

interface Props {
  onSaved: () => void;
}

export function CustomBreathBuilder({ onSaved }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌬️");
  const [inhale, setInhale] = useState(4);
  const [holdIn, setHoldIn] = useState(0);
  const [exhale, setExhale] = useState(4);
  const [holdOut, setHoldOut] = useState(0);
  const [rounds, setRounds] = useState(5);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    if (!name.trim()) { setError("Give your exercise a name."); return; }
    if (inhale < 1) { setError("Inhale must be at least 1 second."); return; }
    if (exhale < 1) { setError("Exhale must be at least 1 second."); return; }
    setError("");
    saveCustomExercise({ name: name.trim(), emoji, inhale, holdIn, exhale, holdOut, rounds });
    setSaved(true);
    onSaved();
    // Reset
    setTimeout(() => {
      setName(""); setEmoji("🌬️"); setInhale(4); setHoldIn(0);
      setExhale(4); setHoldOut(0); setRounds(5); setSaved(false);
    }, 1800);
  }

  const pattern = [inhale, holdIn, exhale, holdOut].filter(v => v > 0).join("-");
  const totalSeconds = (inhale + holdIn + exhale + holdOut) * rounds;
  const totalMin = Math.floor(totalSeconds / 60);
  const totalSec = totalSeconds % 60;

  return (
    <div className="flex flex-col gap-3 mt-4">
      {/* Name + emoji row */}
      <div className="flex gap-2">
        {/* Emoji picker */}
        <div className="relative">
          <select
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="w-12 h-12 rounded-xl text-xl text-center cursor-pointer appearance-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", color: "var(--foreground)" }}
          >
            {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        {/* Name input */}
        <input
          type="text"
          placeholder="Exercise name…"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={28}
          className="flex-1 h-12 rounded-xl px-3 text-sm font-display font-bold"
          style={{
            background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)",
            color: "var(--foreground)", outline: "none",
          }}
        />
      </div>

      {/* Phase pickers */}
      <div className="flex flex-col gap-2">
        <StepPicker label="Inhale" value={inhale} onChange={setInhale} min={1} max={20} />
        <StepPicker label="Hold (after inhale)" value={holdIn} onChange={setHoldIn} min={0} max={20} />
        <StepPicker label="Exhale" value={exhale} onChange={setExhale} min={1} max={20} />
        <StepPicker label="Hold (after exhale)" value={holdOut} onChange={setHoldOut} min={0} max={20} />
        <StepPicker label="Rounds" value={rounds} onChange={setRounds} min={1} max={30} />
      </div>

      {/* Preview */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl"
        style={{ background: "rgba(245,200,66,0.06)", border: "1.5px solid rgba(245,200,66,0.2)" }}>
        <span className="text-xs font-display font-bold" style={{ color: "var(--color-gold)" }}>
          {emoji} {pattern}s · {rounds} rounds
        </span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          ~{totalMin > 0 ? `${totalMin}m ` : ""}{totalSec > 0 ? `${totalSec}s` : ""}
        </span>
      </div>

      {error && <p className="text-xs text-center" style={{ color: "#f87171" }}>{error}</p>}

      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all active:scale-95"
        style={{
          background: saved
            ? "linear-gradient(135deg, #2d8a4e, #1f6e3a)"
            : "linear-gradient(135deg, #f5c842, #e8952a)",
          color: saved ? "#fff" : "#1a0a00",
        }}
      >
        {saved ? "✓ Added to Dashboard!" : "Add to Dashboard →"}
      </button>
    </div>
  );
}

// List of saved custom exercises (shown below builder)
export function CustomBreathList({ onDeleted }: { onDeleted: () => void }) {
  const exercises = loadCustomExercises();
  if (exercises.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-3">
      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Your Custom Exercises</p>
      {exercises.map((ex) => {
        const pattern = [ex.inhale, ex.holdIn, ex.exhale, ex.holdOut].filter(v => v > 0).join("-");
        return (
          <div key={ex.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{ex.emoji}</span>
              <div>
                <p className="font-display font-bold text-sm" style={{ color: "var(--foreground)" }}>{ex.name}</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{pattern}s · {ex.rounds} rounds</p>
              </div>
            </div>
            <button
              onClick={() => { deleteCustomExercise(ex.id); onDeleted(); }}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", fontSize: 11 }}
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
