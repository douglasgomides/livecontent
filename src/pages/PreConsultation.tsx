import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Copy, Check, Link2, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  fetchPreConsultationResponses, linkPreConsultationResponse, fetchRecentSessionsForLinking,
  fetchCustomFormFields, createOrGetShortLink,
} from '@/lib/db';
import { getUserId } from '@/lib/store';
import { PRE_CONSULT_QUESTIONS } from '@/lib/preConsultQuestions';
import type { PreConsultationResponse, CustomFormField } from '@/types/session';

export default function PreConsultation() {
  const [responses, setResponses] = useState<PreConsultationResponse[]>([]);
  const [customFields, setCustomFields] = useState<CustomFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [shortening, setShortening] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);

  const uid = getUserId();
  const link = uid ? `${window.location.origin}/pre-consulta/${uid}` : '';

  const refresh = async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [respList, sessList, fields] = await Promise.all([
        fetchPreConsultationResponses(uid),
        fetchRecentSessionsForLinking(uid),
        fetchCustomFormFields(uid, 'pre_consulta'),
      ]);
      setResponses(respList);
      setSessions(sessList);
      setCustomFields(fields);
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao carregar respostas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const shorten = async () => {
    if (!uid || !link) return;
    setShortening(true);
    try {
      const s = await createOrGetShortLink(uid, link);
      setShortUrl(`${window.location.origin}/s/${s.slug}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao encurtar link');
    } finally {
      setShortening(false);
    }
  };

  const copyShort = async () => {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    setCopiedShort(true);
    toast.success('Link curto copiado');
    setTimeout(() => setCopiedShort(false), 2000);
  };

  const handleLink = async (responseId: string, sessionId: string) => {
    setLinking(responseId);
    try {
      await linkPreConsultationResponse(responseId, sessionId);
      await refresh();
      toast.success('Vinculado à consulta');
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao vincular');
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <div>
        <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2 flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" /> Pré-consulta
        </p>
        <h1 className="font-serif text-4xl mb-2">Formulário de pré-consulta</h1>
        <p className="text-muted-foreground">
          Mande o link abaixo pro paciente antes da consulta. Depois, vincule a resposta à consulta
          gravada correspondente — isso ajuda a inteligência comercial a já entrar no assunto certo.
          Vincule antes de gerar o conteúdo da consulta pra a informação ser aproveitada.
        </p>
      </div>

      <section className="border border-border/60 rounded-xl p-5">
        <h2 className="font-serif text-lg mb-2">Seu link público</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 truncate">{link}</code>
          <Button size="sm" variant="outline" onClick={copyLink} disabled={!link}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            Copiar
          </Button>
        </div>
        {shortUrl ? (
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-xs bg-primary/10 text-primary rounded-md px-3 py-2 truncate">{shortUrl}</code>
            <Button size="sm" variant="outline" onClick={copyShort}>
              {copiedShort ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              Copiar
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={shorten} disabled={shortening || !link}>
            <Scissors className="h-3.5 w-3.5 mr-1.5" /> {shortening ? 'Encurtando…' : 'Encurtar link'}
          </Button>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Perguntas fixas: {PRE_CONSULT_QUESTIONS.map(q => q.label).join(' · ')}
          {customFields.length > 0 && ` · Personalizadas: ${customFields.map(f => f.label).join(' · ')}`}
          {' — '}
          <Link to="/app/custom-fields" className="underline hover:text-foreground">editar campos</Link>
        </p>
      </section>

      <section className="border border-border/60 rounded-xl p-5">
        <h2 className="font-serif text-lg mb-4">Respostas recebidas</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma resposta ainda. Compartilhe o link acima com seus pacientes.</p>
        ) : (
          <div className="space-y-3">
            {responses.map(r => (
              <div key={r.id} className="border border-border/60 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.patientName}</div>
                    {r.patientContact && <div className="text-xs text-muted-foreground">{r.patientContact}</div>}
                    <div className="text-xs text-muted-foreground">{new Date(r.submittedAt).toLocaleString('pt-BR')}</div>
                  </div>
                  {r.linkedSessionId ? (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-primary/15 text-primary font-medium inline-flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Vinculado
                    </span>
                  ) : (
                    <Select onValueChange={v => handleLink(r.id, v)} disabled={linking === r.id}>
                      <SelectTrigger className="w-[220px] h-8 text-xs">
                        <SelectValue placeholder="Vincular a uma consulta" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {PRE_CONSULT_QUESTIONS.map(q => r.answers[q.id] && (
                    <div key={q.id}>
                      <div className="text-xs text-muted-foreground">{q.label}</div>
                      <div className="text-sm">{r.answers[q.id]}</div>
                    </div>
                  ))}
                  {customFields.map(f => r.answers[f.id] && r.answers[f.id]!.length > 0 && (
                    <div key={f.id}>
                      <div className="text-xs text-muted-foreground">{f.label}</div>
                      <div className="text-sm">
                        {Array.isArray(r.answers[f.id]) ? (r.answers[f.id] as string[]).join(', ') : r.answers[f.id]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
