import { Link, useLocation } from 'react-router-dom';
import { 
  Mic, 
  LayoutGrid, 
  FileText, 
  Settings, 
  Sparkles,
  BarChart3,
  HelpCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SidebarProps {
  doctorName: string;
  specialty: string;
}

const menuItems = [
  { id: '/app', icon: LayoutGrid, label: 'Consultas' },
  { id: '/app/record', icon: Mic, label: 'Nova Gravação', highlight: true },
  { id: '/app/content', icon: FileText, label: 'Conteúdos' },
  { id: '/app/analytics', icon: BarChart3, label: 'Análises' },
  { id: '/app/settings', icon: Settings, label: 'Configurações' },
];

export function Sidebar({ doctorName, specialty }: SidebarProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">MedContent</h1>
            <p className="text-xs text-muted-foreground">IA para Médicos</p>
          </div>
        </div>
      </div>

      {/* Doctor Info */}
      <div className="p-4 mx-4 mt-4 rounded-xl bg-secondary/50 border border-border">
        <p className="font-medium text-foreground truncate">{doctorName}</p>
        <p className="text-xs text-muted-foreground truncate">{specialty}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          
          return (
            <Link
              key={item.id}
              to={item.id}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                active 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {item.label}
              {item.highlight && (
                <span className="ml-auto h-2 w-2 rounded-full bg-accent animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
          <HelpCircle className="h-5 w-5" />
          Ajuda & Suporte
        </button>
        <Link
          to="/"
          onClick={() => {
            localStorage.removeItem('medcontent_onboarded');
            localStorage.removeItem('medcontent_settings');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-50 transition-transform duration-300",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}
