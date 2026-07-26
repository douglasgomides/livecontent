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
  Link2,
  Microscope,
  ShieldCheck,
  LayoutTemplate,
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
import { isRecordingActive, LEAVE_RECORDING_WARNING } from '@/lib/recordingGuard';

const createItems = [
  { title: 'Gravar consulta', url: '/app/record', icon: Mic },
  { title: 'Palestra / áudio livre', url: '/app/new/audio-livre', icon: Radio },
  { title: 'Link (YouTube / artigo)', url: '/app/new/link', icon: Link2 },
  { title: 'Upload de áudio', url: '/app/new/upload', icon: Upload },
  { title: 'Voice Note', url: '/app/new/voice-note', icon: MessageCircle },
  { title: 'Science to Content', url: '/app/new/science', icon: FlaskConical },
];

const workItems = [
  { title: 'Dashboard', url: '/app', icon: LayoutDashboard, end: true },
  { title: 'Consultas', url: '/app/consultas', icon: ListChecks },
  { title: 'Aprovações', url: '/app/approvals', icon: CheckSquare },
  { title: 'Calendário', url: '/app/calendar', icon: CalendarDays },
  { title: 'Fila de publicação', url: '/app/publish-queue', icon: Send },
  { title: 'Biblioteca', url: '/app/library', icon: Library },
  { title: 'Evidências', url: '/app/evidence', icon: Microscope },
  { title: 'Estilos de referência', url: '/app/reference-styles', icon: LayoutTemplate },
];

const accountItems = [
  { title: 'Brain', url: '/app/brain', icon: BrainIcon },
  { title: 'Ajustes', url: '/app/settings', icon: Settings },
  { title: 'Admin', url: '/app/admin', icon: ShieldCheck },
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
          <NavLink
            to={item.url}
            end={item.end}
            onClick={(e) => {
              if (isRecordingActive() && !window.confirm(LEAVE_RECORDING_WARNING)) e.preventDefault();
            }}
          >
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
        <Link
          to="/app"
          className="flex items-center gap-2.5 px-2 py-2.5"
          onClick={(e) => {
            if (isRecordingActive() && !window.confirm(LEAVE_RECORDING_WARNING)) e.preventDefault();
          }}
        >
          <div className="h-8 w-8 rounded-md bg-gold-gradient shrink-0 flex items-center justify-center shadow-gold-sm">
            <span className="font-serif font-bold text-primary-foreground text-sm leading-none">C</span>
          </div>
          {!collapsed && (
            <span className="font-serif font-bold text-[15px] tracking-tight truncate text-foreground">Consulta Creator</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Criar</SidebarGroupLabel>
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
