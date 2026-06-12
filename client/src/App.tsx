import { useState, useEffect } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { Toaster } from "@/components/ui/toaster";
import type { User } from "@shared/schema";
import paymentBg from "@/assets/payment_bg.jpeg";

function StripeSuccessScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    // Unlock the user then proceed after showing success
    apiRequest("POST", "/api/unlock", {}).finally(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    });
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  function getTrialEndDate() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  return (
    <div style={{ minHeight: "100dvh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={paymentBg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(8,12,22,0.75)" }} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 32px" }}>
        <div style={{ fontSize: "4rem", marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontWeight: 800, fontSize: "2rem", color: "#ffffff", marginBottom: 10 }}>You're all set!</h1>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.95rem", marginBottom: 6 }}>Your 3-day free journey has started.</p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem" }}>You won't be charged until {getTrialEndDate()}.</p>
        <div style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f5c842", animation: "breathe 1.5s ease-in-out infinite" }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>Entering the temple...</p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  // If coming from landing page (?start=fresh), always show onboarding
  // Check BOTH query string AND hash (hash router may move params into hash)
  const [forceOnboarding, setForceOnboarding] = useState(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    const fromQuery = new URLSearchParams(search).get("start") === "fresh";
    const fromHash = hash.includes("start=fresh");
    if (fromQuery || fromHash) {
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname + "#/");
      return true;
    }
    return false;
  });
  const [stripeSuccess, setStripeSuccess] = useState(() => {
    // Check if Stripe redirected back with ?stripe=success
    return window.location.search.includes("stripe=success") || window.location.hash.includes("stripe=success");
  });

  // Clean up the URL after detecting stripe=success
  useEffect(() => {
    if (stripeSuccess) {
      // Remove the query param from URL cleanly
      const clean = window.location.pathname + "#/";
      window.history.replaceState({}, "", clean);
    }
  }, [stripeSuccess]);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Show success screen right after Stripe redirects back
  if (stripeSuccess) {
    return <StripeSuccessScreen onDone={() => {
      setStripeSuccess(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse font-display text-lg">Centering...</div>
      </div>
    );
  }

  // New user: no name set yet (still "Seeker" with no sessions) OR force back to onboarding
  const isNewUser = !user || (user.name === "Seeker" && user.totalSessions === 0 && user.level === 1);
  // Existing user who hasn't paid yet — send to onboarding to hit payment step
  const needsPayment = user && !user.isPremium && !isNewUser;

  if (isNewUser || forceOnboarding || needsPayment) {
    return (
      <Onboarding
        onComplete={() => {
          setForceOnboarding(false);
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }}
        // If returning unpaid user, skip straight to payment
        startAtPayment={!!needsPayment && !isNewUser && !forceOnboarding}
      />
    );
  }

  return (
    <Dashboard
      onLogout={() => {
        queryClient.clear();
        window.location.reload();
      }}
    />
  );
}

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={AppContent} />
        <Route component={AppContent} />
      </Switch>
      <Toaster />
    </Router>
  );
}
