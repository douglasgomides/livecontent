import { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, Users, FileText, Sparkles, Crown, TrendingUp } from 'lucide-react';
import { fetchAdminOverview, fetchCommercialIntelligenceReport, type AdminOverview, type CommercialIntelligenceReport } from '@/lib/pipeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ARG_CATEGORY_LABEL: Record<string, string> = {
  autoridade: 'Autoridade', prova_social: 'Prova social', urgencia: 'Urgência',
  escassez: 'Escassez', beneficio_funcional: 'Benefício funcional', beneficio_emocional: 'Benefício emocional',
  preco_condicao: 'Preço/condição', garantia: 'Garantia', comparacao: 'Comparação', outro: 'Outro',
};
const OBJ_CATEGORY_LABEL: Record<string, string> = {
  preco: 'Preço', tempo: 'Tempo', medo_dor: 'Medo/dor', duvida_eficacia: 'Dúvida de eficácia',
  precisa_pensar: 'Precisa pensar', terceiros_opiniao: 'Opinião de terceiros', outro: 'Outro',
};
const PAIN_CATEGORY_LABEL: Record<string, string> = {
  estetica: 'Estética', funcional: 'Funcional', emocional: 'Emocional',
  social: 'Social', financeira: 'Financeira', outro: 'Outro',
};

const pct = (n: number | null) => n === null ? '—' : `${Math.round(n * 100)}%`;

export default function Admin() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commercial, setCommercial] = useState<CommercialIntelligenceReport | null>(null);
  const [commercialLoading, setCommercialLoading] = useState(true);
  const [commercialError, setCommercialError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminOverview()
      .then(setData)
      .catch((err: any) => {
        const msg = err?.message ?? String(err);
        if (msg.includes('Forbidden') || msg.includes('403') || msg.includes('não é admin')) setForbidden(true);
        else setError(msg);
      })
      .finally(() => setLoading(false));

    fetchCommercialIntelligenceReport()
      .then(setCommercial)
      .catch((err: any) => setCommercialError(err?.message ?? String(err)))
      .finally(() => setCommercialLoading(false));
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

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Médicos</TabsTrigger>
          <TabsTrigger value="commercial">Inteligência Comercial</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="commercial" className="space-y-6">
          {commercialLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando inteligência comercial…
            </div>
          ) : commercialError || !commercial ? (
            <div className="text-center py-24 text-destructive text-sm">{commercialError ?? 'Falha ao carregar dados.'}</div>
          ) : (
            <CommercialIntelligenceTab data={commercial} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommercialIntelligenceTab({ data }: { data: CommercialIntelligenceReport }) {
  if (data.total_sessoes_com_oferta === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
        <TrendingUp className="h-6 w-6 mx-auto mb-3 opacity-50" />
        Ainda sem consultas com oferta comercial detectada. Os dados aparecem à medida que os médicos gravam consultas reais (não palestra/nota solta).
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={TrendingUp} label="Taxa de fechamento geral" value={pct(data.taxa_fechamento_geral)} tone="gold" />
        <StatCard icon={FileText} label="Consultas com oferta" value={data.total_sessoes_com_oferta} />
        <StatCard icon={FileText} label="Com resultado decidido" value={data.total_sessoes_com_resultado_decidido} />
      </div>

      <Section title="Taxa de fechamento por categoria de argumento">
        <BarList
          rows={data.por_categoria_argumento.map(c => ({
            label: ARG_CATEGORY_LABEL[c.categoria] ?? c.categoria,
            value: c.taxa,
            sub: `${c.fechou}/${c.total}`,
          }))}
        />
      </Section>

      <Section
        title="Ranking de argumentos individuais"
        note={`Amostra mínima de ${data.ranking_argumentos_amostra_minima} consultas por argumento. ${data.ranking_argumentos_omitidos_por_amostra_baixa} de ${data.ranking_argumentos_total_distintos} argumentos distintos ficaram de fora por amostra baixa.`}
      >
        {data.ranking_argumentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum argumento com amostra suficiente ainda.</p>
        ) : (
          <SimpleTable
            columns={['Argumento', 'Taxa', 'Fechou/Total']}
            rows={data.ranking_argumentos.map(a => [a.argumento, pct(a.taxa), `${a.fechou}/${a.total}`])}
          />
        )}
      </Section>

      <Section title="Objeções mais frequentes e taxa de superação">
        <SimpleTable
          columns={['Categoria', 'Ocorrências', 'Taxa de superação']}
          rows={data.objecoes.map(o => [OBJ_CATEGORY_LABEL[o.categoria] ?? o.categoria, String(o.total), pct(o.taxa_superacao)])}
        />
      </Section>

      <Section title="Cruzamento: dor do paciente × argumento vencedor" note="Só consultas fechadas.">
        {data.cruzamento_dor_argumento.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem combinações suficientes.</p>
        ) : (
          <SimpleTable
            columns={['Dor', 'Argumento', 'Consultas fechadas']}
            rows={data.cruzamento_dor_argumento.map(c => [
              PAIN_CATEGORY_LABEL[c.dor_categoria] ?? c.dor_categoria,
              ARG_CATEGORY_LABEL[c.arg_categoria] ?? c.arg_categoria,
              String(c.fechou_count),
            ])}
          />
        )}
      </Section>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Por médico">
          <SimpleTable
            columns={['Médico', 'Especialidade', 'Taxa', 'Total']}
            rows={data.por_medico.map(m => [m.user_id.slice(0, 8), m.specialty, pct(m.taxa), String(m.total)])}
          />
        </Section>
        <Section title="Por especialidade">
          <SimpleTable
            columns={['Especialidade', 'Taxa', 'Total']}
            rows={data.por_especialidade.map(e => [e.specialty, pct(e.taxa), String(e.total)])}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="font-serif text-lg">{title}</h2>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {children}
    </div>
  );
}

function BarList({ rows }: { rows: { label: string; value: number; sub: string }[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate">{r.label}</span>
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${Math.round(r.value * 100)}%` }} />
          </div>
          <span className="w-24 shrink-0 text-right text-muted-foreground">{pct(r.value)} · {r.sub}</span>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>{columns.map(c => <th key={c} className="text-left px-4 py-3">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone?: 'gold' }) {
  return (
    <div className="border border-border/60 rounded-lg p-4">
      <Icon className={`h-4 w-4 mb-2 ${tone === 'gold' ? 'text-primary' : 'text-muted-foreground'}`} />
      <div className="text-2xl font-medium">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
