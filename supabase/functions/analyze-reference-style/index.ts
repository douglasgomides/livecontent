// analyze-reference-style — extrai a ESTRUTURA (não o conteúdo) de um post/carrossel
// de referência que o médico gostou, pra reaproveitar como template em gerações futuras.
// Usa visão do Claude quando é imagem. Nunca deve reproduzir o texto literal original.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-5';

const SYSTEM = `Você é um analista de estrutura de conteúdo para redes sociais médicas.
Você vai receber uma imagem (print de um post/carrossel) ou um texto de legenda que o médico
considerou um bom exemplo. Sua tarefa é descrever APENAS a ESTRUTURA RETÓRICA E VISUAL —
nunca transcrever, citar ou parafrasear de perto o texto literal da peça original. O objetivo
é gerar um template reaproveitável para conteúdo médico completamente diferente, sobre outro tema.

Descreva, em um único parágrafo estruturado:
1. Formato: quantos slides/frames (se for carrossel), proporção, tipo de post.
2. Gancho: COMO a atenção é capturada no primeiro elemento (tipo de frase — pergunta, afirmação
   de choque, dado numérico —, tamanho/peso da fonte, contraste visual). Não repita a frase em si.
3. Progressão: como a informação evolui de slide a slide ou parágrafo a parágrafo (ex: problema →
   agitação → solução → prova social → CTA). Descreva o PAPEL de cada parte, não o conteúdo.
4. Estilo visual: paleta de cores predominante, estilo de tipografia (serifada/sem serifa, peso,
   tamanho), uso de espaço em branco, ícones/elementos gráficos, hierarquia visual entre título e corpo.
5. Estilo do fechamento/CTA: tom (urgente, convidativo, direto), tipo de convite (agendar, comentar,
   salvar, compartilhar) — sem citar a frase exata usada.

REGRA INEGOCIÁVEL: não inclua nenhuma frase, palavra de efeito específica ou dado literal da peça
original na sua resposta — só o PADRÃO estrutural, de forma genérica o suficiente pra caber em
qualquer tema médico. Retorne só o parágrafo descritivo, sem markdown, sem título.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { image_path, text, format_hint } = await req.json();
    if (!image_path && !text) return json({ error: 'Envie image_path ou text' }, 400);
    if (image_path && !image_path.startsWith(`${userId}/`)) return json({ error: 'Invalid image_path' }, 400);

    const content: any[] = [];
    if (image_path) {
      const { data: blob, error: dlErr } = await supabase.storage.from('reference-images').download(image_path);
      if (dlErr || !blob) return json({ error: `download failed: ${dlErr?.message}` }, 400);
      const buf = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      const base64 = btoa(binary);
      const mediaType = blob.type || 'image/jpeg';
      content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } });
      content.push({ type: 'text', text: `Formato indicado pelo médico: ${format_hint ?? 'carousel'}. Analise a estrutura desta imagem.` });
    } else {
      content.push({ type: 'text', text: `Formato indicado pelo médico: ${format_hint ?? 'carousel'}. Analise a estrutura deste texto:\n\n${String(text).slice(0, 4000)}` });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: `anthropic error: ${t.slice(0, 500)}` }, 502);
    }
    const data = await r.json();
    const structure = (data.content?.[0]?.text ?? '').trim();
    if (!structure) return json({ error: 'Resposta vazia do modelo' }, 502);

    return json({ structure_description: structure });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
