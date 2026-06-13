import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { MonkyLoader } from "@/components/MonkyLoader";
import { Toaster } from "@/components/ui/toaster";
import type { User } from "@shared/schema";

function AppContent() {
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

  // Not logged in or not premium → show login screen
  if (!user || !user.isPremium) {
    return (
      <Onboarding
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }}
      />
    );
  }

  // Logged in + premium → dashboard
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
