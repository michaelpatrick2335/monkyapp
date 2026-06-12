import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import monkyMonkeyOnly from "@/assets/monkey_circle.jpeg";
import loginScene from "@/assets/login_scene.jpeg";
import { StripePaywall } from "@/components/StripePaywall";
import type { Tier } from "@/lib/monky-game";

// ─── Slide types ─────────────────────────────────────────────
type Step = "welcome" | "banana" | "name" | "tier" | "payment" | "login";

// ─── Speech bubble component ─────────────────────────────────
function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <div
        style={{
          background: "linear-gradient(135deg, #2d8a4e, #1f6e3a)",
          borderRadius: 20,
          padding: "20px 24px",
          color: "white",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "1.1rem",
          lineHeight: 1.45,
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(45,138,78,0.35)",
        }}
      >
        {children}
      </div>
      {/* Tail pointing down toward monkey */}
      <div
        style={{
          position: "absolute",
          bottom: -14,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "14px solid transparent",
          borderRight: "14px solid transparent",
          borderTop: "16px solid #1f6e3a",
        }}
      />
    </div>
  );
}

// ─── Monkey mascot — new jpeg with multiply blend ─────────────
function MonkyMascot({ size = 100 }: { size?: number }) {
  return (
    <div
      className="breathe"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#0d1520",
        flexShrink: 0,
        boxShadow: "0 0 28px rgba(245,200,66,0.5), 0 0 0 3px rgba(245,200,66,0.4)",
      }}
    >
      <img
        src={monkyMonkeyOnly}
        alt="Monky"
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
      />
    </div>
  );
}

// ─── Benefits data (exported for Dashboard popup) ─────────────
export const BENEFITS = [
  { icon: "💡", title: "Focus", desc: "To handle everything in your life" },
  { icon: "😮‍💨", title: "Stress Less", desc: "Understanding your stress and letting go" },
  { icon: "💚", title: "Healthy Body & Mind", desc: "Hormones and brain start working better" },
  { icon: "🤝", title: "Relationships Improve", desc: "People and partners become more in your life!" },
];

// ─── Tier data ────────────────────────────────────────────────
const TIERS: { id: Tier; label: string; startLevel: number; time: string; color: string }[] = [
  { id: "newbie", label: "Beginner", startLevel: 1, time: "1 min sessions", color: "#2d8a4e" },
  { id: "experienced", label: "Intermediate", startLevel: 250, time: "10 min sessions", color: "#f59e0b" },
  { id: "enlightened", label: "Advance", startLevel: 500, time: "20 min sessions", color: "#a78bfa" },
];

interface OnboardingProps {
  onComplete: () => void;
  startAtPayment?: boolean;
}

const API_BASE = ("__PORT_5000__" as string).startsWith("__") ? "" : "__PORT_5000__";

const _v = "v3-amber"; export function Onboarding({ onComplete, startAtPayment = false }: OnboardingProps) {
  const [step, setStep] = useState<Step>(startAtPayment ? "payment" : "welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  const setupMutation = useMutation({
    mutationFn: async ({ name, tier, email }: { name: string; tier: Tier; email: string }) => {
      const startLevel = tier === "enlightened" ? 500 : tier === "experienced" ? 250 : 1;
      return apiRequest("PATCH", "/api/user", { name, tier, level: startLevel, email: email.trim().toLowerCase() || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setStep("payment");
    },
  });

  const handleStart = () => {
    if (!selectedTier) return;
    const finalName = name.trim() || "Seeker";
    setupMutation.mutate({ name: finalName, tier: selectedTier, email });
  };

  const handleLogin = async () => {
    const trimmed = loginEmail.trim().toLowerCase();
    if (!trimmed) { setLoginError("Please enter your email"); return; }
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        await queryClient.refetchQueries({ queryKey: ["/api/user"] });
        onComplete();
      } else {
        const data = await res.json();
        setLoginError(data.error || "No account found with that email.");
      }
    } catch {
      setLoginError("Something went wrong. Try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ─── Payment step ────────────────────────────────────────────
  if (step === "payment") {
    return (
      <StripePaywall
        userName={name.trim() || "Seeker"}
        onSuccess={async () => {
          await queryClient.refetchQueries({ queryKey: ["/api/user"] });
          onComplete();
        }}

      />
    );
  }

  // ── STEP: Welcome / Login ─────────────────────────────────────
  // Full image from user — jungle scene with monkey, wordmark, pyramid
  if (step === "welcome") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          width: "100%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* The login scene image — fills the whole screen, not zoomed */}
        <img
          src={loginScene}
          alt="MONKy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
          }}
        />

        {/* Gradient fade at bottom so buttons sit cleanly */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "38%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(8,12,22,0.72) 60%, rgba(8,12,22,0.92) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Buttons at the bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0 28px 52px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <button
            onClick={() => setStep("name")}
            style={{
              width: "100%",
              padding: "18px 0",
              borderRadius: 16,
              background: "linear-gradient(135deg, #2d8a4e 0%, #1f6e3a 100%)",
              border: "none",
              color: "#fff",
              fontSize: "1.1rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              letterSpacing: "0.02em",
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(45,138,78,0.5)",
            }}
            data-testid="button-signup"
          >
            Sign up
          </button>
          <button
            onClick={() => setStep("login")}
            style={{
              width: "100%",
              padding: "17px 0",
              borderRadius: 16,
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(10px)",
              border: "2px solid rgba(245,200,66,0.7)",
              color: "#f5c842",
              fontSize: "1.1rem",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              letterSpacing: "0.02em",
              cursor: "pointer",
            }}
            data-testid="button-login"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: Banana intro ────────────────────────────────────────

  // ── STEP: Login by email ──────────────────────────────────────
  if (step === "login") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 stars-bg">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <div className="w-full mb-6">
            <SpeechBubble>Welcome back</SpeechBubble>
          </div>
          <div className="mb-8">
            <MonkyMascot size={100} />
          </div>

          <input
            type="email"
            value={loginEmail}
            onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="your@email.com"
            className="w-full px-5 py-4 rounded-2xl text-base text-center font-display bg-secondary border border-border focus:outline-none transition-all mb-3"
            style={{ borderColor: loginEmail ? "rgba(245,200,66,0.5)" : undefined }}
            data-testid="input-login-email"
            autoFocus
          />

          {loginError && (
            <div className="w-full px-4 py-3 rounded-xl mb-3 text-sm" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95 disabled:opacity-50 mb-4"
            style={{ background: "linear-gradient(135deg, var(--color-saffron), var(--color-gold))", color: "#1a0a00", boxShadow: "0 4px 16px rgba(245,200,66,0.3)" }}
            data-testid="button-login-submit"
          >
            {loginLoading ? "Looking you up..." : "Log In"}
          </button>

          <button
            onClick={() => { setStep("welcome"); setLoginError(""); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-to-welcome"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (step === "banana") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 stars-bg">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          {/* Speech bubble */}
          <div className="w-full mb-6">
            <SpeechBubble>
              As you meditate and move on through the levels you collect your bananas! 🍌
            </SpeechBubble>
          </div>

          {/* Monkey — no arrow */}
          <div className="mb-8">
            <MonkyMascot size={110} />
          </div>

          {/* Banana counter preview */}
          <div
            className="glass-card rounded-2xl px-6 py-4 w-full mb-4"
            style={{ border: "1px solid rgba(255,220,66,0.2)" }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Your banana collection</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[...Array(10)].map((_, i) => (
                <span key={i} style={{ fontSize: i < 3 ? "1.8rem" : "1rem", opacity: i < 3 ? 1 : 0.25 }}>🍌</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Every 10 bananas → new monk rank name</p>
          </div>

          {/* Breath challenge teaser */}
          <div
            className="glass-card rounded-2xl px-5 py-3.5 w-full mb-5 flex items-start gap-3"
            style={{ border: "1px solid rgba(100,180,255,0.2)" }}
          >
            <div style={{ fontSize: "1.5rem", flexShrink: 0, marginTop: 2 }}>🌬️</div>
            <div className="text-left">
              <p className="font-display font-bold text-xs" style={{ color: "rgba(140,200,255,0.9)" }}>
                Breathing Challenges
              </p>
              <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                Every few sessions a challenge appears — complete it for <span style={{ color: "var(--color-gold)" }}>+4 bonus bananas</span>. Box Breath, 4-7-8, Warrior Breath and more.
              </p>
            </div>
          </div>

          {/* Stats preview */}
          <div className="flex gap-3 w-full mb-6">
            {[
              { label: "Levels", value: "1–1000", icon: "⬆️" },
              { label: "Ranks", value: "25 titles", icon: "🏆" },
              { label: "Bananas", value: "Unlimited", icon: "🍌" },
            ].map((s) => (
              <div key={s.label} className="flex-1 glass-card rounded-xl py-3 text-center" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: "1.3rem" }}>{s.icon}</div>
                <div className="font-display font-bold text-xs text-gold mt-1">{s.value}</div>
                <div className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep("tier")}
            className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #2d8a4e, #1f6e3a)", color: "white", boxShadow: "0 4px 16px rgba(45,138,78,0.35)" }}
            data-testid="button-next-banana"
          >
            I'm ready, let's go! →
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: Name entry ──────────────────────────────────────────
  if (step === "name") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 stars-bg">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <div className="w-full mb-6">
            <SpeechBubble>What should I call you, fellow meditator? 🙏</SpeechBubble>
          </div>
          <div className="mb-6">
            <MonkyMascot size={100} />
          </div>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setStep("banana")}
            placeholder="Your name..."
            maxLength={24}
            className="w-full px-5 py-4 rounded-2xl text-base text-center font-display bg-secondary border border-border focus:outline-none transition-all mb-3"
            style={{ borderColor: name ? "rgba(245,200,66,0.5)" : undefined }}
            data-testid="input-name"
            autoFocus
          />

          {/* Email input */}
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(""); }}
            placeholder="Email (used to log back in)"
            className="w-full px-5 py-4 rounded-2xl text-base text-center font-display bg-secondary border border-border focus:outline-none transition-all mb-2"
            style={{ borderColor: emailError ? "rgba(239,68,68,0.8)" : email ? "rgba(245,200,66,0.4)" : undefined }}
            data-testid="input-email"
          />
          {emailError && (
            <p className="text-xs mb-2" style={{ color: "#ef4444" }}>{emailError}</p>
          )}
          <p className="text-xs text-muted-foreground mb-5 opacity-60">Your email lets you log back in and restore your progress.</p>

          <button
            onClick={() => {
              if (!name.trim()) return;
              if (!isValidEmail(email)) {
                setEmailError("Please enter a valid email address.");
                return;
              }
              setStep("banana");
            }}
            className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #2d8a4e, #1f6e3a)", color: "white", boxShadow: "0 4px 16px rgba(45,138,78,0.35)" }}
            data-testid="button-next-name"
          >
            Continue →
          </button>
          
        </div>
      </div>
    );
  }

  // ── STEP: Tier selection ──────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 stars-bg">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-full mb-5">
          <SpeechBubble>
            Please select what level meditator you think you are at?
          </SpeechBubble>
        </div>

        <div className="mb-6">
          <MonkyMascot size={100} />
        </div>

        <div className="flex flex-col gap-3 w-full mb-6">
          {TIERS.map(tier => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
              style={{
                background: selectedTier === tier.id
                  ? `linear-gradient(135deg, ${tier.color}dd, ${tier.color})`
                  : "rgba(255,255,255,0.04)",
                color: selectedTier === tier.id ? "white" : "rgba(255,255,255,0.7)",
                border: `2px solid ${selectedTier === tier.id ? tier.color : "rgba(255,255,255,0.12)"}`,
                boxShadow: selectedTier === tier.id ? `0 4px 20px ${tier.color}40` : undefined,
                transform: selectedTier === tier.id ? "scale(1.03)" : "scale(1)",
              }}
              data-testid={`button-tier-${tier.id}`}
            >
              <div className="flex items-center justify-between px-2">
                <span>{tier.label}</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.75, fontWeight: 400 }}>{tier.time}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={!selectedTier || setupMutation.isPending}
          className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, var(--color-saffron), var(--color-gold))",
            color: "#1a0a00",
            boxShadow: "0 6px 24px rgba(245,200,66,0.25)",
          }}
          data-testid="button-start-journey"
        >
          {setupMutation.isPending ? "Entering temple..." : "Enter the Temple"}
        </button>
      </div>
    </div>
  );
}
// cache-bust 1781196175
// v2-1781196214863333839
