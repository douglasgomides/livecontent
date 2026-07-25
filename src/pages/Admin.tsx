import { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, Users, FileText, Sparkles, Crown } from 'lucide-react';
import { fetchAdminOverview, type AdminOverview } from '@/lib/pipeline';

export default function Admin() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminOverview()
      .then(setData)
      .catch((err: any) => {
        const msg = err?.message ?? String(err);
        if (msg.includes('Forbidden') || msg.includes('403') || msg.includes('não é admin')) setForbidden(true);
        else setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando painel…
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-md mx-auto text-center py-24 space-y-3">
        <ShieldAlert className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
        <p className="text-muted-foreground">Você não tem acesso a esta área.</p>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-center py-24 text-destructive text-sm">{error ?? 'Falha ao carregar dados.'}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl mb-2">Painel Admin</h1>
        <p className="text-muted-foreground">Visão geral de uso em todas as contas.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Médicos" value={data.total_users} />
        <StatCard icon={FileText} label="Sessões" value={data.total_sessions} />
        <StatCard icon={Sparkles} label="Peças geradas" value={data.total_pieces} />
        <StatCard icon={Crown} label="Assinantes Pro" value={data.pro_users} tone="gold" />
      </div>

      <div className="border border-border/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Médico</th>
                <th className="text-left px-4 py-3">Especialidade</th>
                <th className="text-left px-4 py-3">Plano</th>
                <th className="text-right px-4 py-3">Sessões (30d)</th>
                <th className="text-right px-4 py-3">Total sessões</th>
                <th className="text-right px-4 py-3">Falhas</th>
                <th className="text-right px-4 py-3">Peças</th>
                <th className="text-left px-4 py-3">Última atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.email ?? '—'}</div>
                    <div className="text-[10px] text-muted-foreground">desde {new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.specialty ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.plan === 'pro' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {u.plan === 'pro' ? 'Pro' : 'Free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{u.sessions_last_30d}</td>
                  <td className="px-4 py-3 text-right">{u.sessions_total}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={u.sessions_failed > 0 ? 'text-destructive' : 'text-muted-foreground'}>{u.sessions_failed}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{u.content_pieces_total}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.last_activity ? new Date(u.last_activity).toLocaleString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: 'gold' }) {
  return (
    <div className="border border-border/60 rounded-lg p-4">
      <Icon className={`h-4 w-4 mb-2 ${tone === 'gold' ? 'text-primary' : 'text-muted-foreground'}`} />
      <div className="text-2xl font-medium">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
