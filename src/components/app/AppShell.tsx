import { NavLink, Outlet, Link } from 'react-router-dom';
import { Home, Library, Settings, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadProfile } from '@/lib/storage';

const links = [
  { to: '/app', end: true, icon: Home, label: 'Home' },
  { to: '/app/library', icon: Library, label: 'Biblioteca' },
  { to: '/app/settings', icon: Settings, label: 'Ajustes' },
];

export default function AppShell() {
  const p = loadProfile();
  return (
    <div className="min-h-screen bg-background grain">
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-border/60 bg-sidebar hidden md:flex flex-col">
        <div className="px-6 py-6 border-b border-border/60">
          <Link to="/app" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-sm bg-gold-gradient" />
            <span className="font-serif text-xl">Consulta Creator</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`
              }
            >
              <l.icon className="h-4 w-4" /> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border/60">
          <Link to="/app/record">
            <Button className="w-full bg-gold-gradient text-primary-foreground gold-shadow">
              <Mic className="h-4 w-4 mr-2" /> Iniciar Consulta
            </Button>
          </Link>
          <div className="mt-4 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{p?.name}</div>
            <div>{p?.specialty}</div>
          </div>
        </div>
      </aside>

      <div className="md:ml-64">
        <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/60 px-4 py-3 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-sm bg-gold-gradient" />
            <span className="font-serif text-lg">Consulta Creator</span>
          </Link>
          <Link to="/app/record">
            <Button size="sm" className="bg-gold-gradient text-primary-foreground">
              <Mic className="h-4 w-4 mr-1" /> Gravar
            </Button>
          </Link>
        </div>
        <main className="p-6 md:p-10 max-w-6xl">
          <Outlet />
        </main>
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/60 bg-background/95 backdrop-blur flex">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `flex-1 py-3 flex flex-col items-center gap-1 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <l.icon className="h-4 w-4" /> {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
