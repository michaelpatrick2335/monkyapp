import { useState } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { queryClient, getQueryFn, clearUserEmail, hasPickedExperience } from "@/lib/queryClient";
import { Onboarding } from "@/pages/Onboarding";
import { ExperiencePicker } from "@/pages/ExperiencePicker";
import { Dashboard } from "@/pages/Dashboard";
import { Paywall } from "@/pages/Paywall";
import { MonkyLoader } from "@/components/MonkyLoader";
import { Toaster } from "@/components/ui/toaster";
import type { User } from "@shared/schema";

const IS_IOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

function AppContent() {
  // Local flag: once user taps a level, go straight to Dashboard — no re-fetch needed
  const [experienceDone, setExperienceDone] = useState(false);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) {
    return <MonkyLoader />;
  }

  // Not logged in → login screen
  if (!user) {
    return (
      <Onboarding
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }}
      />
    );
  }

  // Logged in but not premium
  // • On iOS: show the in-app paywall (Apple IAP)
  // • On web: send back to login (web signup uses the Stripe paywall in the marketing flow)
  if (!user.isPremium) {
    if (IS_IOS) {
      return (
        <Paywall
          userName={user.name || "friend"}
          onUnlock={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          }}
        />
      );
    }
    return (
      <Onboarding
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }}
      />
    );
  }

  // First-ever login: show experience picker
  // experienceDone state OR localStorage flag both bypass this — belt + suspenders
  const needsExperiencePick = !experienceDone && user.totalSessions === 0 && !hasPickedExperience();
  if (needsExperiencePick) {
    return (
      <ExperiencePicker
        onComplete={() => {
          // Set local state immediately — triggers re-render without any API round-trip
          setExperienceDone(true);
        }}
      />
    );
  }

  // Fully set up → dashboard
  return (
    <Dashboard
      onLogout={() => {
        clearUserEmail();
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
