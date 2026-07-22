import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
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
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { loadProfile } from "./lib/storage";

const queryClient = new QueryClient();

const RequireOnboarded = ({ children }: { children: React.ReactNode }) => {
  const p = loadProfile();
  if (!p?.onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/app" element={<RequireOnboarded><AppShell /></RequireOnboarded>}>
            <Route index element={<Home />} />
            <Route path="record" element={<Recording />} />
            <Route path="new/upload" element={<UploadAudio />} />
            <Route path="new/voice-note" element={<VoiceNote />} />
            <Route path="new/science" element={<ScienceToContent />} />
            <Route path="session/:id" element={<SessionDetail />} />
            <Route path="library" element={<Library />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
