import { Link, Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

export default function AppShell() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full premium-bg">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border/50 bg-background/70 backdrop-blur-xl sticky top-0 z-30 px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="font-serif font-semibold text-base text-foreground/90">Consulta Creator</span>
            </div>
            <Link to="/app/record">
              <Button size="sm" className="bg-gold-gradient text-primary-foreground hover:opacity-90 shadow-gold-sm rounded-md font-medium">
                <Mic className="h-4 w-4 mr-2" /> Iniciar consulta
              </Button>
            </Link>
          </header>
          <main className="flex-1 p-6 md:p-10 max-w-6xl w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
