import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Mic,
  Upload,
  MessageCircle,
  FlaskConical,
  ListChecks,
  Library,
  Settings,
  CheckSquare,
  Brain as BrainIcon,
  Send,
  Radio,
  CalendarDays,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { loadProfile } from '@/lib/storage';
import { loadBrain, getCompleteness } from '@/lib/brainStorage';

const createItems = [
  { title: 'Gravar consulta', url: '/app/record', icon: Mic },
  { title: 'Upload de áudio', url: '/app/new/upload', icon: Upload },
  { title: 'Voice Note', url: '/app/new/voice-note', icon: MessageCircle },
  { title: 'Áudio livre', url: '/app/new/audio-livre', icon: Radio },
  { title: 'Science to Content', url: '/app/new/science', icon: FlaskConical },
];


const workItems = [
  { title: 'Dashboard', url: '/app', icon: LayoutDashboard, end: true },
  { title: 'Consultas', url: '/app/consultas', icon: ListChecks },
  { title: 'Aprovações', url: '/app/approvals', icon: CheckSquare },
  { title: 'Calendário', url: '/app/calendar', icon: CalendarDays },
  { title: 'Fila de publicação', url: '/app/publish-queue', icon: Send },
  { title: 'Biblioteca', url: '/app/library', icon: Library },
];


const accountItems = [
  { title: 'Brain', url: '/app/brain', icon: BrainIcon },
  { title: 'Ajustes', url: '/app/settings', icon: Settings },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { pathname } = useLocation();
  const profile = loadProfile();

  const isActive = (path: string, end?: boolean) =>
    end ? pathname === path : pathname === path || pathname.startsWith(path + '/');

  const brainPct = getCompleteness(loadBrain()).total;

  const renderItem = (item: { title: string; url: string; icon: any; end?: boolean }) => {
    const showBadge = item.url === '/app/brain' && brainPct < 60 && !collapsed;
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={isActive(item.url, item.end)} tooltip={item.title}>
          <NavLink to={item.url} end={item.end}>
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.title}</span>
            {showBadge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{brainPct}%</span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/app" className="flex items-center gap-2 px-2 py-2">
          <div className="h-7 w-7 rounded-sm bg-gold-gradient shrink-0 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-[1px] bg-background" />
          </div>
          {!collapsed && <span className="font-mono text-[11px] tracking-[0.2em] uppercase truncate">Consulta<span className="text-primary">/</span>Creator</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary">Criar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{createItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Trabalho</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{workItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{accountItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && profile && (
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="px-2 py-2 text-xs">
            <div className="font-medium text-foreground truncate">{profile.name}</div>
            <div className="text-muted-foreground truncate">{profile.specialty}</div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
