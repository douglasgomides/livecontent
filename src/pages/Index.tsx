import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ConsultationDashboard } from '@/components/dashboard/ConsultationDashboard';
import { RecordingInterface } from '@/components/recording/RecordingInterface';
import { DoctorSettingsForm } from '@/components/settings/DoctorSettingsForm';
import { ContentGenerator } from '@/components/content/ContentGenerator';
import { ConsultationHistory } from '@/components/history/ConsultationHistory';
import type { DoctorSettings } from '@/types/consultation';

const headerTitles: Record<string, { title: string; subtitle?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão geral da última consulta' },
  record: { title: 'Nova Consulta', subtitle: 'Grave o áudio da consulta' },
  content: { title: 'Gerador de Conteúdo', subtitle: 'Transforme consultas em conteúdo' },
  history: { title: 'Histórico', subtitle: 'Todas as suas consultas' },
  settings: { title: 'Configurações', subtitle: 'Personalize sua experiência' },
};

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [doctorSettings, setDoctorSettings] = useState<DoctorSettings | null>(null);

  const handleRecordingComplete = (audioBlob: Blob, duration: number) => {
    console.log('Recording complete:', { audioBlob, duration });
    // In a real app, this would upload and process the audio
  };

  const handleSaveSettings = (settings: DoctorSettings) => {
    setDoctorSettings(settings);
    console.log('Settings saved:', settings);
  };

  const { title, subtitle } = headerTitles[activeTab] || { title: 'MedContent' };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="ml-64">
        <Header title={title} subtitle={subtitle} />
        
        <div className="p-6">
          {activeTab === 'dashboard' && <ConsultationDashboard />}
          
          {activeTab === 'record' && (
            <div className="py-12">
              <RecordingInterface onRecordingComplete={handleRecordingComplete} />
            </div>
          )}
          
          {activeTab === 'content' && <ContentGenerator />}
          
          {activeTab === 'history' && <ConsultationHistory />}
          
          {activeTab === 'settings' && (
            <DoctorSettingsForm 
              initialSettings={doctorSettings || undefined}
              onSave={handleSaveSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
