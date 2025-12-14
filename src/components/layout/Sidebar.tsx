import { 
  Mic, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Sparkles,
  History,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'record', icon: Mic, label: 'Gravar Consulta' },
  { id: 'content', icon: Sparkles, label: 'Conteúdo' },
  { id: 'history', icon: History, label: 'Histórico' },
  { id: 'settings', icon: Settings, label: 'Configurações' },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-50">
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

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              {item.label}
              {item.id === 'record' && (
                <span className="ml-auto h-2 w-2 rounded-full bg-accent animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Help Section */}
      <div className="p-4 border-t border-border">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
          <HelpCircle className="h-5 w-5" />
          Ajuda & Suporte
        </button>
      </div>
    </aside>
  );
}
