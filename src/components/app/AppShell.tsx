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
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-foreground">System · Online</span>
              </div>
            </div>
            <Link to="/app/record">
              <Button size="sm" className="bg-foreground text-background hover:bg-primary hover:text-primary-foreground rounded-sm font-mono text-[10px] uppercase tracking-[0.2em]">
                <Mic className="h-3.5 w-3.5 mr-1.5" /> Iniciar consulta
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
