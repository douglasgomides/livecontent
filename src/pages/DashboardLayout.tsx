import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ConsultationsPage } from '@/components/pages/ConsultationsPage';
import { RecordingPage } from '@/components/pages/RecordingPage';
import { ConsultationDetailPage } from '@/components/pages/ConsultationDetailPage';
import { ContentLibraryPage } from '@/components/pages/ContentLibraryPage';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { AnalyticsPage } from '@/components/pages/AnalyticsPage';
import type { DoctorSettings, Consultation } from '@/types/consultation';
import { generateDemoConsultations } from '@/lib/demoData';

interface DashboardLayoutProps {
  doctorSettings: DoctorSettings | null;
  onSettingsUpdate: (settings: DoctorSettings) => void;
}

const getHeaderInfo = (pathname: string): { title: string; subtitle?: string } => {
  if (pathname.includes('/app/consultation/')) {
    return { title: 'Detalhes da Consulta', subtitle: 'Dashboard completo' };
  }
  switch (pathname) {
    case '/app':
    case '/app/':
      return { title: 'Consultas', subtitle: 'Gerencie suas gravações' };
    case '/app/record':
      return { title: 'Nova Consulta', subtitle: 'Grave o áudio da consulta' };
    case '/app/content':
      return { title: 'Biblioteca de Conteúdo', subtitle: 'Todos os conteúdos gerados' };
    case '/app/analytics':
      return { title: 'Análises', subtitle: 'Métricas e insights' };
    case '/app/settings':
      return { title: 'Configurações', subtitle: 'Personalize sua experiência' };
    default:
      return { title: 'MedContent' };
  }
};

export default function DashboardLayout({ doctorSettings, onSettingsUpdate }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [consultations, setConsultations] = useState<Consultation[]>(() => {
    const saved = localStorage.getItem('medcontent_consultations');
    if (saved) {
      return JSON.parse(saved).map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt)
      }));
    }
    return generateDemoConsultations();
  });

  useEffect(() => {
    localStorage.setItem('medcontent_consultations', JSON.stringify(consultations));
  }, [consultations]);

  const handleNewConsultation = (consultation: Consultation) => {
    setConsultations(prev => [consultation, ...prev]);
    navigate(`/app/consultation/${consultation.id}`);
  };

  const handleUpdateConsultation = (id: string, updates: Partial<Consultation>) => {
    setConsultations(prev => 
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };

  const { title, subtitle } = getHeaderInfo(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        doctorName={doctorSettings?.name || 'Médico'} 
        specialty={doctorSettings?.specialty || ''}
      />
      
      <main className="lg:ml-64">
        <Header title={title} subtitle={subtitle} />
        
        <div className="p-4 lg:p-6">
          <Routes>
            <Route 
              path="/" 
              element={
                <ConsultationsPage 
                  consultations={consultations} 
                  onNavigate={(id) => navigate(`/app/consultation/${id}`)}
                />
              } 
            />
            <Route 
              path="/record" 
              element={
                <RecordingPage onComplete={handleNewConsultation} />
              } 
            />
            <Route 
              path="/consultation/:id" 
              element={
                <ConsultationDetailPage 
                  consultations={consultations}
                  onUpdate={handleUpdateConsultation}
                />
              } 
            />
            <Route 
              path="/content" 
              element={<ContentLibraryPage consultations={consultations} />} 
            />
            <Route 
              path="/analytics" 
              element={<AnalyticsPage consultations={consultations} />} 
            />
            <Route 
              path="/settings" 
              element={
                <SettingsPage 
                  settings={doctorSettings} 
                  onSave={onSettingsUpdate}
                />
              } 
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}
