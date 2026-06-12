import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import monkyMonkeyOnly from "@/assets/monkey_new.jpeg";

interface PaywallProps {
  onUnlock: () => void;
  userName: string;
}

const PERKS = [
  { icon: "🧘", text: "Unlimited daily meditations" },
  { icon: "🍌", text: "Full banana & level progression" },
  { icon: "🔔", text: "Bell sounds & monk music" },
  { icon: "🔥", text: "Streak tracking & stats" },
  { icon: "🐒", text: "All 25 monk rank names + evolving mascot" },
  { icon: "✨", text: "Access to Experienced & Enlightened tiers" },
];

export function Paywall({ onUnlock, userName }: PaywallProps) {
  const [purchased, setPurchased] = useState(false);

  const unlockMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/unlock", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setPurchased(true);
      setTimeout(onUnlock, 1800);
    },
  });

  if (purchased) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center stars-bg px-6 text-center">
        <div className="text-6xl mb-4 level-up">🙏</div>
        <h2 className="font-display text-gold text-2xl font-bold mb-2">Welcome to the temple, {userName}</h2>
        <p className="text-muted-foreground text-sm">Your journey has no limit now.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-5 py-8 stars-bg overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: '#1a3d2b', marginBottom: 16, border: '2px solid rgba(245,200,66,0.3)', boxShadow: '0 0 24px rgba(245,200,66,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={monkyMonkeyOnly} alt="Monky" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
        </div>
        <h1 className="font-display text-gold font-bold" style={{ fontSize: "1.7rem" }}>
          Your 3 free sessions are up
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 max-w-xs">
          Unlock the full MONKy journey — unlimited meditations, all ranks, and your growing monk companion.
        </p>
      </div>

      {/* Price card */}
      <div
        className="glass-card rounded-3xl p-5 w-full max-w-sm mb-5"
        style={{ border: "1.5px solid rgba(245,200,66,0.3)", boxShadow: "0 0 30px rgba(245,200,66,0.08)" }}
      >
        {/* Lifetime label */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-display font-bold text-foreground text-lg">MONKy Full Access</p>
            <p className="text-muted-foreground text-xs">Monthly subscription · Cancel anytime</p>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-gold text-2xl">$4.99</p>
            <p className="text-muted-foreground text-xs">/month</p>
          </div>
        </div>

        {/* Perks list */}
        <div className="flex flex-col gap-2.5">
          {PERKS.map((perk, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg w-7 flex-shrink-0">{perk.icon}</span>
              <span className="text-sm text-foreground">{perk.text}</span>
              <svg className="ml-auto flex-shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill="rgba(245,200,66,0.15)" />
                <path d="M4 7L6 9L10 5" stroke="#f5c842" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => unlockMutation.mutate()}
        disabled={unlockMutation.isPending}
        className="w-full max-w-sm py-5 rounded-3xl font-display font-bold text-lg transition-all active:scale-95 hover:scale-[1.02] disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, var(--color-saffron), var(--color-gold))",
          color: "#1a0a00",
          boxShadow: "0 8px 32px rgba(245,200,66,0.3)",
        }}
        data-testid="button-unlock"
      >
        {unlockMutation.isPending ? "Unlocking..." : "Unlock for $4.99 🙏"}
      </button>

      {/* Fine print */}
      <p className="text-xs text-muted-foreground mt-3 text-center max-w-xs">
        $4.99/month. Cancel anytime. Your progress is always saved.
      </p>

      {/* Restore note */}
      <button className="mt-4 text-xs text-muted-foreground underline underline-offset-4 opacity-60 hover:opacity-100 transition-opacity">
        Restore purchase
      </button>
    </div>
  );
}
