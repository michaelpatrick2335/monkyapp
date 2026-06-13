import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MeditationTimer } from "@/components/MeditationTimer";
import { BreathChallengeScreen } from "@/components/BreathChallenge";
import { Settings } from "@/pages/Settings";
import { BenefitPopup, BENEFIT_POPUPS } from "@/components/BenefitPopup";
import { MustReadPopup } from "@/components/MustReadPopup";
import { MusicPickerPopup } from "@/components/MusicPickerPopup";
import monkyMonkeyOnly from "@/assets/monkey_circle.jpeg";
import { MonkyLoader } from "@/components/MonkyLoader";
import monkyWordmark from "@/assets/wordmark_new.jpeg";
import {
  getMonkName,
  getNextNameAt,
  getMeditationDuration,
  getBananaProgress,
  formatDuration,
  TIERS,
} from "@/lib/monky-game";
import { getAffirmation } from "@/lib/affirmations";
import { getRandomChallenge, shouldShowChallenge, BREATH_CHALLENGES, type BreathChallenge } from "@/lib/breath-challenges";
import { BUILTIN_TRACKS } from "@/lib/meditation-tracks";
import type { User } from "@shared/schema";

interface FloatingBanana {
  id: number;
  x: number;
}

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [meditating, setMeditating] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [activeBenefit, setActiveBenefit] = useState<number | null>(null);
  const [prevLevel, setPrevLevel] = useState<number | null>(null);
  const [floatingBananas, setFloatingBananas] = useState<FloatingBanana[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<BreathChallenge | null>(null);
  const [practiceChallenge, setPracticeChallenge] = useState<BreathChallenge | null>(null);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showMustRead, setShowMustRead] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showChallengeOffer, setShowChallengeOffer] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState<BreathChallenge | null>(null);
  const [bonusBananaAnim, setBonusBananaAnim] = useState<number | null>(null);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const completeMutation = useMutation({
    mutationFn: async (durationSeconds: number) =>
      apiRequest("POST", "/api/session-complete", { durationSeconds }).then(r => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setMeditating(false);
      // Floating banana
      setFloatingBananas(prev => [...prev, { id: Date.now(), x: 50 + (Math.random() - 0.5) * 40 }]);
      setTimeout(() => setFloatingBananas(prev => prev.slice(1)), 1600);
      // Level up
      if (data.leveledUp) {
        setLevelUpLevel(data.newLevel ?? null);
        setShowLevelUp(true);
        // Show benefit popup after sessions 1-4 (for all tiers)
        const sessions = data.user?.totalSessions ?? 0;
        if (sessions >= 1 && sessions <= 4) {
          setTimeout(() => setActiveBenefit(sessions - 1), 2200);
        }
      }
      // Check for breathing challenge (every 3 sessions)
      const newTotal = data.user?.totalSessions ?? 0;
      if (shouldShowChallenge(newTotal)) {
        const challenge = getRandomChallenge(newTotal);
        setPendingChallenge(challenge);
        // Show after level-up overlay if present, else immediately
        setTimeout(() => setActiveChallenge(challenge), data.leveledUp ? 500 : 800);
      }
    },
  });

  const challengeCompleteMutation = useMutation({
    mutationFn: async (bananas: number) =>
      apiRequest("POST", "/api/challenge-complete", { bananas }).then(r => r.json()),
    onSuccess: (data: any, bananas: number) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setActiveChallenge(null);
      setPendingChallenge(null);
      // Animate multiple banana floats
      setBonusBananaAnim(bananas);
      for (let i = 0; i < bananas; i++) {
        setTimeout(() => {
          setFloatingBananas(prev => [...prev, { id: Date.now() + i, x: 30 + Math.random() * 40 }]);
          setTimeout(() => setFloatingBananas(prev => prev.slice(1)), 1600);
        }, i * 180);
      }
      setTimeout(() => setBonusBananaAnim(null), 2500);
    },
  });

  if (isLoading || !user) {
    return (<MonkyLoader />
    );
  }

  const API_BASE = ("__PORT_5000__" as string).startsWith("__") ? "" : "__PORT_5000__";

  // Music helpers for stats panel
  function toggleMusicPreview(trackId: string) {
    if (previewingTrackId === trackId) {
      stopMusicPreview();
      return;
    }
    stopMusicPreview();
    setPreviewingTrackId(trackId);
    const audio = new Audio(`https://monky.pplx.app/app/audio/${trackId}.mp3`);
    audio.volume = 1.0;
    audio.play().catch(() => {});
    audio.onended = () => setPreviewingTrackId(null);
    previewAudioRef.current = audio;
    setTimeout(() => stopMusicPreview(), 30000);
  }
  function stopMusicPreview() {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingTrackId(null);
  }
  async function setActiveTrack(id: string) {
    await apiRequest("POST", "/api/music-active", { id });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }

  const monkName = getMonkName(user.bananas);
  const nextNameAt = getNextNameAt(user.bananas);
  const bananaProgress = getBananaProgress(user.bananas);
  const tierInfo = TIERS[user.tier as keyof typeof TIERS];
  const sessionDuration = getMeditationDuration(user.level);

  // Level progress in current bracket of 10
  const levelInBracket = ((user.level - 1) % 10) + 1;
  const levelProgress = (levelInBracket / 10) * 100;

  // Show breath challenge full-screen (triggered after session)
  if (activeChallenge) {
    return (
      <BreathChallengeScreen
        challenge={activeChallenge}
        onComplete={(bananasEarned) => challengeCompleteMutation.mutate(bananasEarned)}
        onSkip={() => { setActiveChallenge(null); setPendingChallenge(null); }}
      />
    );
  }

  // Show practice challenge full-screen (launched from stats panel — no reward)
  if (practiceChallenge) {
    return (
      <BreathChallengeScreen
        challenge={practiceChallenge}
        practiceMode
        onComplete={() => setPracticeChallenge(null)}
        onSkip={() => setPracticeChallenge(null)}
      />
    );
  }

  if (showSettings) {
    return (
      <Settings
        user={user}
        onBack={() => setShowSettings(false)}
        onLogout={() => {
          setShowSettings(false);
          onLogout();
        }}
      />
    );
  }

  if (meditating) {
    return (
      <MeditationTimer
        durationSeconds={sessionDuration}
        onComplete={() => completeMutation.mutate(sessionDuration)}
        onCancel={() => setMeditating(false)}
        customMusicTrackId={user.activeMusicTrack ?? "bliss"}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-8 stars-bg relative overflow-hidden">
      {/* Floating bananas */}
      {floatingBananas.map(b => (
        <div
          key={b.id}
          className="fixed text-3xl pointer-events-none float-banana z-50"
          style={{ bottom: "30%", left: `${b.x}%` }}
        >
          🍌
        </div>
      ))}

      {/* Benefit popup — shown after sessions 1, 2, 3, 4 */}
      {activeBenefit !== null && BENEFIT_POPUPS[activeBenefit] && (
        <BenefitPopup
          data={BENEFIT_POPUPS[activeBenefit]}
          onClose={() => setActiveBenefit(null)}
        />
      )}

      {showMustRead && (
        <MustReadPopup
          onClose={() => {
            setShowMustRead(false);
            setMeditating(true);
          }}
        />
      )}

      {showMusicPicker && (
        <MusicPickerPopup
          initialTrackId={user.activeMusicTrack}
          onClose={() => setShowMusicPicker(false)}
          onConfirm={async (trackId) => {
            await apiRequest("POST", "/api/music-active", { id: trackId });
            await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            setShowMusicPicker(false);
            setShowMustRead(true);
          }}
        />
      )}

      {/* Level up celebration */}
      {showLevelUp && levelUpLevel && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(13,15,26,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowLevelUp(false)}
        >
          <div
            className="glass-card rounded-3xl text-center level-up border mx-5"
            style={{ borderColor: "rgba(245,200,66,0.5)", maxWidth: 340, padding: "2rem 1.8rem" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl mb-3">🙏</div>
            <div className="font-display text-gold text-2xl font-bold mb-1">Level {levelUpLevel}</div>
            <div className="text-muted-foreground text-xs uppercase tracking-widest mb-4">Level reached</div>
            <p
              className="text-foreground text-sm leading-relaxed mb-6"
              style={{ fontStyle: "italic", opacity: 0.9 }}
            >
              &ldquo;{getAffirmation(levelUpLevel)}&rdquo;
            </p>
            <button
              onClick={() => setShowLevelUp(false)}
              className="font-display font-bold text-sm px-8 py-3 rounded-2xl transition-all active:scale-95"
              style={{ background: "var(--color-gold)", color: "#0d0f1a" }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between mb-6">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-widest">Welcome back</p>
          <p className="font-display font-bold text-foreground text-base">{user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(s => !s)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-stats"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main monkey card */}
      <div className="glass-card rounded-3xl p-6 w-full max-w-sm mb-5 flex flex-col items-center">
        {/* Tier badge */}
        <div
          className="text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
          style={{ background: `${tierInfo.color}20`, color: tierInfo.color, border: `1px solid ${tierInfo.color}40` }}
          data-testid="text-tier-badge"
        >
          {tierInfo.emoji} {tierInfo.label}
        </div>

        {/* Monkey logo / Profile pic */}
        <div className="mb-3 breathe" style={{ filter: 'drop-shadow(0 0 24px rgba(245,200,66,0.5))' }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', background: '#0d1520', boxShadow: '0 0 0 3px rgba(245,200,66,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={user.profilePic ? `${("__PORT_5000__" as string).startsWith("__") ? "" : "__PORT_5000__"}/api/profile-pic/file?t=${Date.now()}` : monkyMonkeyOnly}
              alt="Monky"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: user.profilePic ? 'center' : 'center 20%' }}
              data-testid="img-monkey"
            />
          </div>
        </div>

        {/* Monk name */}
        <h2
          className="font-display font-bold mb-0.5"
          style={{ fontSize: "1.4rem", color: "var(--color-gold)" }}
          data-testid="text-monk-name"
        >
          {monkName}
        </h2>
        <p className="text-muted-foreground text-sm mb-4">Level {user.level} · {user.bananas} 🍌</p>

        {/* Banana rank progress */}
        <div className="w-full mb-5">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Rank Progress</span>
            {nextNameAt !== null ? (
              <span>{user.bananas % 10}/10 bananas → {getMonkName(nextNameAt)}</span>
            ) : (
              <span>Maximum rank achieved</span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${bananaProgress}%`,
                background: `linear-gradient(90deg, var(--color-saffron), var(--color-gold))`,
              }}
            />
          </div>
        </div>

        {/* Level progress */}
        <div className="w-full mb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Level Progress</span>
            <span>Lvl {user.level} → {user.level + 1}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${levelProgress}%`,
                background: `linear-gradient(90deg, ${tierInfo.color}80, ${tierInfo.color})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Today's session info */}
      <div className="glass-card rounded-2xl px-5 py-4 w-full max-w-sm mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Today's Session</p>
            <p className="font-display font-bold text-gold text-xl">{formatDuration(sessionDuration)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Streak</p>
            <p className="font-display font-bold text-foreground text-xl">🔥 {user.streakDays}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Sessions</p>
            <p className="font-display font-bold text-foreground text-xl">{user.totalSessions}</p>
          </div>
        </div>
      </div>

      {/* Stats panel */}
      {showStats && (
        <div className="glass-card rounded-2xl px-5 py-4 w-full max-w-sm mb-5">

          {/* Meditation Music */}
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Meditation Music</p>
          <div className="flex flex-col gap-2 mb-5">
            {BUILTIN_TRACKS.map(track => {
              const isActive = (user.activeMusicTrack ?? "bliss") === track.id;
              const isPlaying = previewingTrackId === track.id;
              return (
                <div
                  key={track.id}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: isActive ? "rgba(245,200,66,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${isActive ? "rgba(245,200,66,0.35)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  {/* Play/pause preview */}
                  <button
                    onClick={() => toggleMusicPreview(track.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                    style={{ background: isPlaying ? "rgba(245,200,66,0.2)" : "rgba(255,255,255,0.07)" }}
                  >
                    {isPlaying ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-gold)"><rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/></svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><polygon points="5,3 19,12 5,21"/></svg>
                    )}
                  </button>
                  {/* Track info + select */}
                  <button className="flex-1 flex items-center justify-between text-left" onClick={() => setActiveTrack(track.id)}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: "0.9rem" }}>{track.emoji}</span>
                      <span className="font-display font-bold text-xs" style={{ color: isActive ? "var(--color-gold)" : "var(--foreground)" }}>{track.name}</span>
                    </div>
                    {isActive && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <h3 className="font-display font-bold text-sm text-foreground mb-3 uppercase tracking-wider">Your Journey</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Bananas</p>
              <p className="font-bold text-gold text-lg">{user.bananas} 🍌</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Time</p>
              <p className="font-bold text-foreground text-lg">{Math.floor(user.totalSecondsMediated / 60)}m</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Current Level</p>
              <p className="font-bold text-foreground text-lg">{user.level} / 1000</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Day Streak</p>
              <p className="font-bold text-foreground text-lg">{user.streakDays} 🔥</p>
            </div>
          </div>

          {/* Level milestones */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tier Milestones</p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "🌱 Newbie", range: "Lvl 1–249", color: "#4ade80", active: user.tier === "newbie" },
                { label: "🔥 Experienced", range: "Lvl 250–499", color: "#f59e0b", active: user.tier === "experienced" },
                { label: "✨ Enlightened", range: "Lvl 500–1000", color: "#a78bfa", active: user.tier === "enlightened" },
              ].map(m => (
                <div
                  key={m.label}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: m.active ? `${m.color}15` : "transparent",
                    border: `1px solid ${m.active ? m.color + "40" : "rgba(255,255,255,0.05)"}`,
                  }}
                >
                  <span style={{ color: m.active ? m.color : "var(--muted-foreground)" }}>{m.label}</span>
                  <span className="text-muted-foreground">{m.range}</span>
                  {m.active && <span style={{ color: m.color }}>← You</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Breath Exercises */}
          <div className="mt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Breath Exercises</p>
            {
              // Unlocked = user has completed at least 1 challenge (total sessions >= 3)
              // Each subsequent challenge unlocks every 3 sessions
              // Index 0 unlocks at session 3, index 1 at session 6, etc.
            }
            <div className="flex flex-col gap-2">
              {BREATH_CHALLENGES.map((ch, idx) => {
                const unlocked = user.totalSessions >= (idx + 1) * 3;
                return (
                  <button
                    key={ch.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && setPracticeChallenge(ch)}
                    data-testid={`button-practice-${ch.id}`}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all active:scale-95"
                    style={{
                      background: unlocked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${unlocked ? "rgba(245,200,66,0.25)" : "rgba(255,255,255,0.06)"}`,
                      opacity: unlocked ? 1 : 0.45,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl" style={{ filter: unlocked ? "none" : "grayscale(1)" }}>{ch.emoji}</span>
                      <div>
                        <p className="font-display font-bold text-xs" style={{ color: unlocked ? "var(--color-gold)" : "var(--muted-foreground)" }}>
                          {ch.name}
                        </p>
                        <p className="text-xs text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                          {ch.totalRounds} rounds · {ch.phases.map(p => p.count).join("-")}s
                        </p>
                      </div>
                    </div>
                    {unlocked ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    ) : (
                      <span className="text-xs text-muted-foreground" style={{ fontSize: "0.6rem" }}>🔒 {(idx + 1) * 3} sessions</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2 opacity-50">Complete every 3 sessions to unlock</p>
          </div>
        </div>
      )}

      {/* Meditate CTA */}
      <button
        onClick={() => {
            if (user.totalSessions === 0) {
              setShowMusicPicker(true);
            } else {
              setMeditating(true);
            }
          }}
        className="w-full max-w-sm py-5 rounded-3xl font-display font-bold text-lg transition-all active:scale-95 hover:scale-[1.02] shadow-lg"
        style={{
          background: `linear-gradient(135deg, var(--color-saffron), var(--color-gold))`,
          color: "#1a0a00",
          boxShadow: "0 8px 32px rgba(245, 200, 66, 0.25)",
        }}
        data-testid="button-meditate"
      >
        Begin Meditation
      </button>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        {formatDuration(sessionDuration)} session · +1 banana · +1 level
      </p>
    </div>
  );
}
// v2-1781196214864722648
