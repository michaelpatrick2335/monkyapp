import { useState } from "react";
import { queryClient, setUserEmail } from "@/lib/queryClient";
import monkyMonkeyOnly from "@/assets/monkey_circle.jpeg";
import loginScene from "@/assets/login_scene.jpeg";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

const API_BASE = ("__PORT_5000__" as string).startsWith("__") ? "" : "__PORT_5000__";

// ── Speech bubble ─────────────────────────────────────────────
function SpeechBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          color: "#1a0a00",
          borderRadius: 18,
          padding: "12px 20px",
          fontSize: "1rem",
          fontWeight: 600,
          lineHeight: 1.4,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          textAlign: "center",
          maxWidth: 280,
          margin: "0 auto",
        }}
      >
        {children}
      </div>
      {/* triangle */}
      <div
        style={{
          width: 0, height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "12px solid rgba(255,255,255,0.95)",
          margin: "0 auto",
        }}
      />
    </div>
  );
}

// ── Monkey mascot ─────────────────────────────────────────────
function MonkyMascot({ size = 100 }: { size?: number }) {
  return (
    <img
      src={monkyMonkeyOnly}
      alt="MONKy"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        objectPosition: "center 20%",
        border: "3px solid rgba(245,200,66,0.5)",
        boxShadow: "0 0 32px rgba(245,200,66,0.25), 0 8px 24px rgba(0,0,0,0.4)",
        animation: "breathe 4s ease-in-out infinite",
      }}
    />
  );
}

// ── Main Login Screen ─────────────────────────────────────────
export function Onboarding({ onComplete }: { onComplete: () => void; startAtPayment?: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter your email."); return; }
    if (!trimmed.includes("@")) { setError("Enter a valid email address."); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      // Login returns the user object directly (not wrapped in { user: ... })
      const userData = data.user ?? data;
      if (res.ok && userData?.isPremium !== undefined) {
        setUserEmail(trimmed);
        queryClient.setQueryData(["/api/user"], userData);
        onComplete();
      } else {
        setError(data.error || "No account found. Sign up at monkyapp.com");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Background */}
      <img
        src={loginScene}
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center top",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute", inset: 0,
          background: "rgba(8,10,20,0.65)",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        className="w-full max-w-sm flex flex-col items-center text-center"
        style={{ position: "relative", zIndex: 2 }}
      >
        {/* Email input */}
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="your@email.com"
          className="w-full px-5 py-4 rounded-2xl text-base text-center font-display bg-secondary border border-border focus:outline-none transition-all mb-3"
          style={{ borderColor: email ? "rgba(245,200,66,0.5)" : undefined }}
          data-testid="input-login-email"
          autoFocus
        />

        {/* Error */}
        {error && (
          <div
            className="w-full px-4 py-3 rounded-xl mb-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95 disabled:opacity-50 mb-5"
          style={{
            background: "linear-gradient(135deg, #f5c842, #e8952a)",
            color: "#1a0a00",
            boxShadow: "0 4px 20px rgba(245,200,66,0.35)",
          }}
          data-testid="button-login-submit"
        >
          {loading ? "Looking you up..." : "Log In"}
        </button>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            gap: 12,
            margin: "4px 0 18px",
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
          <span>New here?</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
        </div>

        {/* Create account button — opens monkyapp.com signup in in-app browser */}
        <button
          onClick={async () => {
            const signupUrl = "https://www.monkyapp.com/?signup=1";
            try {
              if (Capacitor.isNativePlatform()) {
                await Browser.open({
                  url: signupUrl,
                  presentationStyle: "popover",
                  toolbarColor: "#0d0f1a",
                });
              } else {
                window.open(signupUrl, "_blank");
              }
            } catch {
              window.open(signupUrl, "_blank");
            }
          }}
          className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95 mb-3"
          style={{
            background: "transparent",
            color: "#f5c842",
            border: "2px solid rgba(245,200,66,0.5)",
          }}
          data-testid="button-create-account"
        >
          Create Account
        </button>

        {/* Helper text */}
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginTop: 4, maxWidth: 280 }}>
          Sign up at monkyapp.com to start your free 3-day trial.
          After signup, return here to log in.
        </p>
      </div>
    </div>
  );
}
