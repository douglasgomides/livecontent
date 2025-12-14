import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardLayout from "./pages/DashboardLayout";
import NotFound from "./pages/NotFound";
import type { DoctorSettings } from "./types/consultation";

const queryClient = new QueryClient();

const App = () => {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    const saved = localStorage.getItem('medcontent_onboarded');
    return saved === 'true';
  });

  const [doctorSettings, setDoctorSettings] = useState<DoctorSettings | null>(() => {
    const saved = localStorage.getItem('medcontent_settings');
    return saved ? JSON.parse(saved) : null;
  });

  const handleOnboardingComplete = (settings: DoctorSettings) => {
    setDoctorSettings(settings);
    setIsOnboarded(true);
    localStorage.setItem('medcontent_onboarded', 'true');
    localStorage.setItem('medcontent_settings', JSON.stringify(settings));
  };

  const handleSettingsUpdate = (settings: DoctorSettings) => {
    setDoctorSettings(settings);
    localStorage.setItem('medcontent_settings', JSON.stringify(settings));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                isOnboarded 
                  ? <Navigate to="/app" replace /> 
                  : <LandingPage />
              } 
            />
            <Route 
              path="/onboarding" 
              element={
                isOnboarded 
                  ? <Navigate to="/app" replace />
                  : <OnboardingPage onComplete={handleOnboardingComplete} />
              } 
            />
            <Route 
              path="/app/*" 
              element={
                isOnboarded 
                  ? <DashboardLayout 
                      doctorSettings={doctorSettings} 
                      onSettingsUpdate={handleSettingsUpdate}
                    />
                  : <Navigate to="/" replace />
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
