import { Link, Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

export default function AppShell() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background grain">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur sticky top-0 z-30 px-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Link to="/app" className="font-serif text-base md:hidden">Consulta Creator</Link>
            </div>
            <Link to="/app/record">
              <Button size="sm" className="bg-gold-gradient text-primary-foreground gold-shadow">
                <Mic className="h-4 w-4 mr-1.5" /> Iniciar consulta
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
