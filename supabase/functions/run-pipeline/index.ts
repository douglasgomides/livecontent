// run-pipeline — orquestrador agentico do pipeline de uma sessão.
// Faz: transcrição -> anonimização -> extração de tópicos -> geração por formato.
// Atualiza sessions.status a cada etapa (Realtime).
import { corsHeaders } from '../_shared/cors.ts';
import { scoreCFMSemantic } from '../_shared/cfm.ts';
import { extractPatientSignals } from '../_shared/patientSignals.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CLAUDE = 'claude-sonnet-4-5';

const FORMAT_CHANNEL: Record<string, string> = {
  reel: 'instagram', carousel: 'instagram', caption: 'instagram', stories: 'instagram',
  linkedin: 'linkedin', blog: 'blog', youtube: 'youtube', tiktok: 'tiktok',
  podcast: 'podcast', gmb: 'gmb', doctoralia: 'doctoralia', website: 'website',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { session_id, formats, reference_style_id } = await req.json();
    if (!session_id) return json({ error: 'Missing session_id' }, 400);

    const { data: session, error: sErr } = await supabase
      .from('sessions').select('*').eq('id', session_id).maybeSingle();
    if (sErr || !session) return json({ error: 'Session not found' }, 404);
    if (session.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    // Limite de uso: cada geração dispara várias chamadas pagas de IA (Claude + Whisper).
    // Sem isso, uma conta comprometida ou um loop de retry no cliente gera custo ilimitado.
    // Limite por hora (rede de segurança contra abuso/loop) + limite mensal por plano.
    const { data: subRow } = await supabase.from('subscriptions').select('plan, status').eq('user_id', userId).maybeSingle();
    const isPro = subRow?.plan === 'pro' && subRow?.status === 'active';

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentRuns } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo);
    const RATE_LIMIT_PER_HOUR = isPro ? 60 : 20;
    if ((recentRuns ?? 0) > RATE_LIMIT_PER_HOUR) {
      return json({ error: 'Limite de gerações por hora atingido. Tente novamente mais tarde.' }, 429);
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: monthlyRuns } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo);
    const MONTHLY_LIMIT = isPro ? 500 : 8;
    if ((monthlyRuns ?? 0) > MONTHLY_LIMIT) {
      return json({ error: isPro
        ? 'Limite mensal do plano Pro atingido. Fale com o suporte.'
        : 'Limite do plano Free atingido (8 gerações/mês). Faça upgrade pra Pro em Ajustes.' }, 429);
    }

    const { data: brainRow } = await supabase.from('brains').select('*').eq('user_id', userId).maybeSingle();
    const brain = brainRow ? { doctor: brainRow.doctor, patient: brainRow.patient, brand: brainRow.brand } : null;

    const { data: settingsRow } = await supabase.from('doctor_settings').select('*').eq('user_id', userId).maybeSingle();
    const preferredFormats: string[] = (settingsRow?.preferred_formats as any) ?? ['caption', 'carousel', 'reel', 'linkedin'];
    const targetFormats: string[] = Array.isArray(formats) && formats.length ? formats : preferredFormats;

    // Biblioteca de evidências do médico — única fonte de citação permitida.
    // Nunca deixamos o modelo inventar DOI/revista/autor: ou cita algo real daqui, ou não cita nada.
    const { data: evidenceRows } = await supabase
      .from('evidence_sources').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(30);
    const evidence = evidenceRows ?? [];

    // Estrutura de referência (opcional) — o médico escolheu uma peça que gostou.
    // Se for peça de outra pessoa/conta, reaproveitamos só o PADRÃO estrutural (nunca
    // texto literal). Se for peça do próprio médico, o texto extraído já pode ser mais
    // fiel (feito em analyze-reference-style), então a instrução de geração também
    // libera uma adaptação mais próxima nesse caso.
    let referenceStructure: string | null = null;
    let referenceOwnership: 'own' | 'other' = 'other';
    if (reference_style_id) {
      const { data: refRow } = await supabase
        .from('reference_styles').select('structure_description, source_ownership')
        .eq('id', reference_style_id).eq('user_id', userId).maybeSingle();
      referenceStructure = refRow?.structure_description ?? null;
      referenceOwnership = refRow?.source_ownership === 'own' ? 'own' : 'other';
    }

    // Objeções aprendidas (opt-in): agregação on-demand, nada pré-computado guardado
    // no Brain (evita ficar desatualizado, evita cron). Só roda se o médico ativou
    // explicitamente em Insights — mesmo com amostra suficiente, nunca liga sozinho.
    // Nunca sobrescreve brain.patient.commonObjections (curadoria manual, fonte distinta).
    let objectionsBlock = '';
    if (brainRow?.objections_opt_in) {
      const { data: sigRows } = await supabase
        .from('patient_signals').select('category')
        .eq('user_id', userId).eq('kind', 'objection');
      const counts = new Map<string, number>();
      (sigRows ?? []).forEach(r => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
      const top = [...counts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if ((sigRows?.length ?? 0) >= 8 && top.length) {
        objectionsBlock = `\n\n## Objeções comuns dos seus pacientes (baseado em ${sigRows!.length} sinais reais)\n` +
          top.map(([c, n]) => `- ${OBJECTION_LABEL[c] ?? c} (${n}x)`).join('\n') +
          '\nSempre que fizer sentido para o tema, antecipe e desarme proativamente 1-2 dessas objeções reais, sem soar defensivo.';
      }
    }

    async function setStatus(status: string, extra: Record<string, any> = {}) {
      await supabase.from('sessions').update({ status, error_message: null, ...extra }).eq('id', session_id);
    }
    async function setError(msg: string) {
      await supabase.from('sessions').update({ status: 'failed', error_message: msg }).eq('id', session_id);
    }

    const skipAnon = ['science', 'link', 'audio_livre'].includes(session.source);
    // 'voice_note' é a nota rápida de 1 post: sem checkpoint de revisão de tópicos,
    // gera direto uma legenda a partir do único tópico extraído.
    const isQuickNote = session.source === 'voice_note';

    // ── Fase 1: transcrever (se necessário) ──────────────────────────────
    let rawTranscript: string = session.raw_transcript ?? '';
    if (!rawTranscript) {
      if (!session.audio_path) { await setError('No transcript'); return json({ error: 'No transcript' }, 400); }
      if (!openaiKey) { await setError('OPENAI_API_KEY not configured'); return json({ error: 'OPENAI_API_KEY not configured' }, 500); }
      await setStatus('transcribing');
      const { data: blob, error: dlErr } = await supabase.storage.from('consultation-audio').download(session.audio_path);
      if (dlErr || !blob) { await setError(`download failed: ${dlErr?.message}`); return json({ error: 'download failed' }, 500); }
      const form = new FormData();
      form.append('file', blob, session.audio_path.split('/').pop() ?? 'audio.webm');
      form.append('model', 'whisper-1');
      form.append('language', 'pt');
      const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: form,
      });
      if (!r.ok) { const t = await r.text(); await setError(`whisper: ${t.slice(0, 300)}`); return json({ error: 'whisper failed' }, 502); }
      const trData = await r.json();
      rawTranscript = trData.text ?? '';
      await supabase.from('sessions').update({ raw_transcript: rawTranscript }).eq('id', session_id);
    }

    // ── Fase 2: anonimizar — PARA aqui pra revisão humana ────────────────
    // Fontes que já chegam sem PII (science/link/audio_livre) pulam direto pra
    // extração de tópicos NA MESMA chamada, sem checkpoint. As demais (recording/
    // upload/voice_note) param em 'anonymization_review' e só continuam quando o
    // médico confirmar na tela — o que dispara uma NOVA chamada a este endpoint.
    let anonymized: string = session.anonymized_transcript ?? '';
    if (!anonymized) {
      if (skipAnon) {
        anonymized = rawTranscript;
        await supabase.from('sessions').update({ anonymized_transcript: anonymized }).eq('id', session_id);
      } else {
        await setStatus('anonymizing');
        const anonRes = await claudeJson(anthropicKey, { system: ANON_SYSTEM, user: rawTranscript, maxTokens: 8000 });
        let piiFindings: any[] = [];
        if (anonRes.ok) {
          anonymized = anonRes.data.anonymized ?? rawTranscript;
          piiFindings = Array.isArray(anonRes.data.findings) ? anonRes.data.findings : [];
        } else {
          // não bloqueia: usa transcript bruto e loga — revisão humana ainda vai pegar
          console.warn('[anonymize failed]', anonRes.error);
          anonymized = rawTranscript;
        }
        await supabase.from('sessions').update({
          anonymized_transcript: anonymized,
          pii_findings: piiFindings,
        }).eq('id', session_id);
        await setStatus('anonymization_review');
        return json({ ok: true, stage: 'anonymization_review' });
      }
    }

    // ── Fase 3: extrair tópicos — PARA aqui pra revisão humana ───────────
    // Se já existem tópicos (retomada após confirmação humana), reusa-os tal como
    // o médico deixou (títulos/resumos editados, inclusão marcada).
    let topics: any[] = [];
    const { data: existingTopics } = await supabase.from('topics').select('*').eq('session_id', session_id).order('position');
    if (existingTopics && existingTopics.length) {
      topics = existingTopics.map(t => ({
        id: t.id, title: t.title, summary: t.summary, funnelStage: t.funnel_stage, included: t.included,
      }));
    } else {
      await setStatus('extracting_topics');
      const brainCtx = brain ? `\n\n## Perfil do médico:\n${JSON.stringify(brain).slice(0, 2000)}` : '';
      const topRes = await claudeJson(anthropicKey, {
        system: TOPICS_SYSTEM,
        user: `Transcrição:\n${anonymized}${brainCtx}`,
        maxTokens: 3000,
      });
      if (!topRes.ok) { await setError(`topics: ${topRes.error}`); return json({ error: topRes.error }, 502); }
      const arr = Array.isArray(topRes.data) ? topRes.data : [];
      if (!arr.length) { await setError('No topics extracted'); return json({ error: 'No topics' }, 502); }
      const rows = arr.map((t: any, i: number) => ({
        user_id: userId,
        session_id,
        title: String(t.title ?? 'Tema'),
        summary: String(t.summary ?? ''),
        funnel_stage: ['C0', 'C1', 'C2', 'C3'].includes(t.funnelStage) ? t.funnelStage : 'C1',
        included: true,
        position: i,
      }));
      const { data: inserted, error: insErr } = await supabase.from('topics').insert(rows).select('*');
      if (insErr) { await setError(insErr.message); return json({ error: insErr.message }, 500); }
      topics = (inserted ?? []).map(t => ({
        id: t.id, title: t.title, summary: t.summary, funnelStage: t.funnel_stage, included: t.included,
      }));

      if (!isQuickNote) {
        await setStatus('topics_review');
        return json({ ok: true, stage: 'topics_review', topics: topics.length });
      }
      // voice_note: sem checkpoint, segue direto pra geração da legenda única.
    }

    // ── Fase 4: gerar conteúdo (retomada após confirmação dos tópicos, ou
    // direto no caso de voice_note) ──────────────────────────────────────
    // Roda as combinações tema×formato em paralelo, mas em LOTES pequenos —
    // Promise.all sem limite disparava tudo de uma vez e estourava o limite
    // de requisições simultâneas da Anthropic; todas as chamadas eram
    // rejeitadas (429) e o catch por-job engolia isso silenciosamente,
    // terminando com status "ready" e zero peças, sem erro nenhum visível.
    // A ARTE visual do carrossel/stories não é gerada aqui — fica sob demanda
    // (botão "Gerar arte" no piece), pra não somar mais uma chamada no caminho crítico.
    await setStatus('generating_content');
    const genFormats = isQuickNote ? ['caption'] : targetFormats;
    const jobs: { topic: any; format: string }[] = [];
    for (const topic of topics) {
      if (topic.included === false) continue;
      for (const format of genFormats) jobs.push({ topic, format });
    }

    // Inteligência comercial: roda em paralelo à geração de conteúdo, nunca bloqueia
    // nem derruba a sessão — só a transcrição ANONIMIZADA é usada, e uma falha aqui
    // vira warning silencioso, nunca setError (é analytics, não caminho crítico).
    const signalsPromise = extractPatientSignals(anthropicKey, anonymized).catch(() => []);

    const CONCURRENCY = 3;
    const pieces: any[] = [];
    let failures = 0;
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      const batch = jobs.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(async ({ topic, format }) => {
        try {
          const body = await claudeText(anthropicKey, buildGenSystem(format), buildGenUser(topic, format, anonymized, brain, evidence, referenceStructure, referenceOwnership, objectionsBlock));
          const cfm = await scoreCFMSemantic(anthropicKey, body);
          const evidenceIds = matchCitedEvidence(body, evidence);
          return {
            user_id: userId,
            session_id,
            topic_id: topic.id,
            format,
            channel: FORMAT_CHANNEL[format] ?? 'instagram',
            body,
            cfm,
            artwork: null,
            evidence_ids: evidenceIds,
            reference_style_id: reference_style_id ?? null,
            approved: false,
            rejected: false,
          };
        } catch (err) {
          console.warn(`[gen ${format}/${topic.id}]`, err);
          return null;
        }
      }));
      for (const r of results) {
        if (r) pieces.push(r); else failures++;
      }
    }

    if (failures > 0) console.warn(`[run-pipeline] ${failures}/${jobs.length} gerações falharam`);

    if (pieces.length) {
      const { error: pErr } = await supabase.from('content_pieces').insert(pieces);
      if (pErr) { await setError(pErr.message); return json({ error: pErr.message }, 500); }
    } else if (jobs.length > 0) {
      // Todas as gerações falharam — nunca silenciar isso como "ready" vazio.
      await setError(`Falha ao gerar conteúdo: nenhuma das ${jobs.length} peças foi gerada (provavelmente limite de taxa da API). Tente novamente.`);
      return json({ error: 'all generations failed' }, 502);
    }

    const signals = await signalsPromise;
    if (signals.length) {
      const { error: sigErr } = await supabase.from('patient_signals').insert(
        signals.map(s => ({ user_id: userId, session_id, topic_id: null, ...s })),
      );
      if (sigErr) console.warn('[signals] insert failed', sigErr.message);
    }

    await setStatus('ready');
    return json({ ok: true, stage: 'ready', topics: topics.length, pieces: pieces.length });
  } catch (e) {
    console.error('[run-pipeline]', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

// ─── Claude helpers ─────────────────────────────────────────────────────────

const ANON_SYSTEM = `Você é um sistema de anonimização de transcrições de consultas médicas em português brasileiro.
Substitua nomes, prontuários, endereços, planos, profissões identificáveis, contatos, familiares, colegas por marcadores entre colchetes ([paciente], [prontuário], [endereço removido], [plano], [profissão], [contato], [familiar], [colega]).
Mantenha sintomas, exames, condutas e a fala do médico.
Retorne SÓ JSON: {"anonymized": "...", "findings": [{"original":"...","replacement":"...","type":"name|id|plan|address|contact|profession|other"}]}
Sem markdown.`;

const TOPICS_SYSTEM = `Você é um estrategista de conteúdo para médicos brasileiros.
Extraia de 2 a 5 tópicos autosuficientes com gancho, resumo e funnelStage (C0/C1/C2/C3).
Nunca inventar dados. Sem hashtags, emojis, travessão ou clichês de IA.
Retorne SÓ um JSON array: [{"title":"...","summary":"...","funnelStage":"C0|C1|C2|C3"}]
Sem markdown.`;

const BASE_RULES = `## Regras universais
- NUNCA hashtags em nenhum formato (nem LinkedIn). NUNCA travessão (—). NUNCA "não é X, é Y".
- NUNCA clichês de IA. Tom direto. Frases curtas. CTA específico.
## Regras CFM
- Sem "cura", "100%", "garantido", "sem risco", "milagre", "melhor do Brasil".
- Sem antes-e-depois identificável. Sem diagnóstico à distância. Sem posologia. Sem preço. Sem indicação nominal de colega.`;

// Estruturas "campeãs" por formato (2026) — o que decide alcance/salvamento em
// cada plataforma hoje, não só a forma do texto.
const FORMAT_SYS: Record<string, string> = {
  carousel: 'Carrossel médico, 7-10 slides (ideal 7 — é o mínimo que segura atenção sem afastar quem passa rápido). SLIDE 1 (capa): gancho de 4-7 palavras, pergunta direta ou promessa clara — decide se o usuário desliza. SLIDE 2: contexto, por que importa agora. SLIDES 3-4: desenvolvimento (mito x verdade, passo a passo, um ponto por slide, sem jargão nos primeiros). SLIDES 5-6: virada, o dado ou raciocínio clínico que ninguém conta. SLIDE 7: resumo em uma frase. SLIDE FINAL: CTA de salvar/compartilhar (nunca "segue"). Máx 280 chars por slide.',
  reel: 'Reel em 4 blocos com tempo: GANCHO (0-3s, dor ou curiosidade imediata, direto pra câmera, sem enrolação) → DESENVOLVIMENTO (4-20s, entrega o prometido no gancho, uma ideia por frase, corte seco entre falas) → VIRADA (21-25s, informação que quebra expectativa) → CTA (últimos 3-5s, ação específica: salvar, comentar palavra-gatilho, ou agendar). Indique duração alvo (15-30s pra alcance/descoberta, 60-90s pra tutorial/autoridade — acima disso a retenção cai). Sempre observe que o vídeo precisa de legenda on-screen (a maioria assiste sem som).',
  caption: 'Legenda IG em 3 versões: CURTA (≤5 linhas), MÉDIA (8-12), LONGA (15-20). Estrutura Gancho-Corpo-CTA: linha 1 gera tensão ou curiosidade específica sobre o tema (decide o "ver mais"); corpo aprofunda o que a imagem/vídeo não disse (nunca repete o carrossel/reel que acompanha); fecha com CTA e, quando fizer sentido, uma pergunta que puxe comentário qualificado. Sem hashtags.',
  linkedin: 'Post LinkedIn como tese editorial, não anúncio: 1a linha é o gancho (aparece antes do "ver mais" — afirmação ou dado que para o feed); desenvolvimento traz a tese pessoal/clínica do médico com exemplo real ou raciocínio prático, parágrafos curtos, tom direto sem jargão excessivo; fechamento sintetiza a tese; CTA convida a comentário qualificado ou conexão, nunca venda direta. Sem hashtags.',
  stories: 'Stories: 7-10 frames em 3 partes. Frame 1 = gancho (headline forte, por que assistir). Frames 2 até o penúltimo = valor, um ponto por frame, texto grande e legível, legenda de texto obrigatória. Frame final = ação clara (enquete, caixinha de pergunta, ou convite a marcar alguém). Não é repost automático do Reel — complementa e aprofunda o tema do dia.',
  gmb: 'Post Google Meu Negócio 150-300 palavras. Linguagem de busca. CTA agendar.',
  blog: 'Artigo markdown 800-1500 palavras, pensado pra SEO E pra resposta de IA generativa (AEO/GEO). # Título com a palavra-chave principal e a promessa de resposta. Primeiro parágrafo já responde a pergunta central, sem enrolação. ## H2s organizados por sub-pergunta real do público, parágrafos curtos. Seção de FAQ com 3-5 perguntas objetivas ao final. Fecha com bio/credenciais do médico + CTA.',
  youtube: 'Roteiro YouTube com uma promessa só (nunca 3 assuntos no mesmo vídeo). Sugira título e conceito de thumbnail coerentes com o conteúdo real (elemento humano, alto contraste). [ABERTURA 0-10s: gancho direto, sem introdução institucional] [DESENVOLVIMENTO: blocos de 1-3min por subtema, exemplos concretos, sugestão de apoio visual em tela] [FECHAMENTO: resumo da mensagem central] [CTA: inscrição, próximo vídeo relacionado, ou agendamento].',
  tiktok: 'TikTok 45s: [Hook 0-3s][Desenvolvimento][CTA]. Descreva legendas on-screen.',
  podcast: 'Podcast ~15min. Abertura, contexto, aprofundamento, prática, fecho.',
  doctoralia: 'Artigo Doctoralia 300-500 palavras. Título com condição, sinais, avaliação, CTA.',
  website: 'HTML semântico <article><h1><p><section><h2>...</section>. Sem clickbait.',
};

function buildGenSystem(format: string) {
  return `${BASE_RULES}\n\n${FORMAT_SYS[format] ?? FORMAT_SYS.caption}`;
}
function buildEvidenceBlock(evidence: any[]): string {
  if (!evidence.length) {
    return '\n\n## Evidência científica disponível\nNenhuma fonte cadastrada pelo médico. NÃO cite estudo, revista, autor ou dado estatístico específico — fale em termos gerais de prática clínica, sem inventar referência.';
  }
  const list = evidence.map((e, i) =>
    `[${i + 1}] ${e.title}${e.authors ? ` — ${e.authors}` : ''}${e.journal ? ` (${e.journal}${e.year ? `, ${e.year}` : ''})` : ''} · nível: ${e.evidence_level}`
  ).join('\n');
  return `\n\n## Evidência científica disponível — ÚNICA fonte permitida pra citação
${list}

Se for citar um estudo/dado científico, cite APENAS um dos itens acima (pelo título ou achado, em linguagem natural). NUNCA invente DOI, autor, revista ou estatística que não esteja nesta lista. Se nenhum item for relevante pro tema, não cite estudo nenhum — fale em termos gerais sem referência específica.`;
}

function matchCitedEvidence(body: string, evidence: any[]): string[] {
  const lower = body.toLowerCase();
  return evidence
    .filter(e => {
      const titleStart = String(e.title || '').slice(0, 24).toLowerCase().trim();
      const authorSurname = String(e.authors || '').split(/[, ]/)[0].toLowerCase().trim();
      return (titleStart.length > 6 && lower.includes(titleStart))
        || (authorSurname.length > 3 && lower.includes(authorSurname));
    })
    .map(e => e.id);
}

// Rótulos legíveis pra taxonomia fixa de _shared/patientSignals.ts — usados só no
// texto do prompt de objeções aprendidas (apresentação, a fonte de verdade é o extrator).
const OBJECTION_LABEL: Record<string, string> = {
  price_cost: 'Preço/custo', fear_procedure_side_effects: 'Medo do procedimento/efeitos',
  need_think_it_over: 'Precisa pensar', family_spouse_approval: 'Aprovação de família/cônjuge',
  insurance_coverage: 'Cobertura de plano', previous_bad_experience: 'Experiência ruim anterior',
  scheduling_time: 'Tempo/agenda', other: 'Outro',
};

function buildGenUser(topic: any, _format: string, transcript: string, brain: any, evidence: any[] = [], referenceStructure: string | null = null, referenceOwnership: 'own' | 'other' = 'other', objectionsBlock: string = '') {
  const funnelDesc: Record<string, string> = {
    C0: 'não sabe que o problema existe', C1: 'reconhece sintoma, tem crenças erradas',
    C2: 'quer saber o que fazer', C3: 'quase-paciente, precisa de prova',
  };
  const b = brain
    ? `\n\n## Perfil do médico:\n${JSON.stringify(brain).slice(0, 1500)}`
    : '';
  // 'own': a referência é do próprio médico — pode adaptar de perto (cadência, conectores).
  // 'other': referência de terceiro — só o padrão estrutural, nunca frase literal.
  const refBlock = referenceStructure
    ? referenceOwnership === 'own'
      ? `\n\n## Estrutura e estilo de uma peça sua anterior — adapte de perto (mesma cadência, mesmos conectores), só trocando tema/dados específicos\n${referenceStructure}`
      : `\n\n## Estrutura de referência a seguir (formato/gancho/progressão/estilo — NUNCA copie frases, só o padrão)\n${referenceStructure}`
    : '';
  return `## Tema
Título: ${topic.title}
Resumo: ${topic.summary}
Funil: ${topic.funnelStage} — ${funnelDesc[topic.funnelStage] ?? ''}

## Transcrição base (não copiar literalmente)
${String(transcript).slice(0, 1500)}${b}${buildEvidenceBlock(evidence)}${refBlock}${objectionsBlock}

Gere o conteúdo agora aplicando todas as regras universais e CFM${referenceStructure ? ', seguindo a estrutura de referência acima' : ''}.`;
}

async function claudeText(key: string, system: string, user: string): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE, max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return (data.content?.[0]?.text ?? '').trim();
}

async function claudeJson(key: string, args: { system: string; user: string; maxTokens?: number })
  : Promise<{ ok: true; data: any } | { ok: false; error: string }>
{
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: CLAUDE, max_tokens: args.maxTokens ?? 4000,
        system: args.system, messages: [{ role: 'user', content: args.user }],
      }),
    });
    if (!r.ok) return { ok: false, error: `anthropic ${r.status}: ${(await r.text()).slice(0, 200)}` };
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
