import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import AppShell from "./components/app/AppShell";
import Dashboard from "./pages/Dashboard";
import Consultas from "./pages/Consultas";
import Recording from "./pages/Recording";
import UploadAudio from "./pages/UploadAudio";
import VoiceNote from "./pages/VoiceNote";
import ScienceToContent from "./pages/ScienceToContent";
import SessionDetail from "./pages/SessionDetail";
import Library from "./pages/Library";
import Approvals from "./pages/Approvals";
import PublishQueue from "./pages/PublishQueue";
import AudioLivre from "./pages/AudioLivre";
import LinkImport from "./pages/LinkImport";
import BrainPage from "./pages/Brain";
import CalendarPage from "./pages/Calendar";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useBrain } from "./lib/brainStorage";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, hydrated } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm tracking-widest uppercase animate-pulse">Carregando…</div>
      </div>
    );
  }
  return <>{children}</>;
};

const RequireOnboarded = ({ children }: { children: React.ReactNode }) => {
  const brain = useBrain();
  if (!brain.onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <RequireOnboarded><AppShell /></RequireOnboarded>
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="consultas" element={<Consultas />} />
              <Route path="record" element={<Recording />} />
              <Route path="new/upload" element={<UploadAudio />} />
              <Route path="new/voice-note" element={<VoiceNote />} />
              <Route path="new/audio-livre" element={<AudioLivre />} />
              <Route path="new/link" element={<LinkImport />} />
              <Route path="new/science" element={<ScienceToContent />} />
              <Route path="session/:id" element={<SessionDetail />} />
              <Route path="library" element={<Library />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="publish-queue" element={<PublishQueue />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="brain" element={<BrainPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
