// analyze-reference-style — extrai o padrão de um post/carrossel de referência que o
// médico gostou, pra reaproveitar como template em gerações futuras. Usa visão do
// Claude pra estrutura, e OpenAI (gpt-4o) pra transcrição literal da copy quando a
// peça é do próprio médico — dá pra adaptar bem mais fiel quando quem chamou souber
// exatamente o que o texto original dizia, não só a estrutura abstrata.
// O comportamento muda conforme a ORIGEM da referência:
// - 'other' (padrão, peça de outra pessoa/conta): só ESTRUTURA abstrata — nunca
//   transcreve, cita ou parafraseia de perto o texto literal. Protege contra risco
//   de direito autoral.
// - 'own' (peça do próprio médico): pode extrair a copy real e descrever como
//   readaptá-la de perto — sem risco, porque o autor é o próprio usuário.
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-5';

const SYSTEM_OTHER = `Você é um analista de estrutura de conteúdo para redes sociais médicas.
Você vai receber uma imagem (print de um post/carrossel) ou um texto de legenda que o médico
considerou um bom exemplo, de OUTRA pessoa ou conta (não é do próprio médico). Sua tarefa é
descrever APENAS a ESTRUTURA RETÓRICA E VISUAL — nunca transcrever, citar ou parafrasear de
perto o texto literal da peça original. O objetivo é gerar um template reaproveitável para
conteúdo médico completamente diferente, sobre outro tema.

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

const SYSTEM_OWN = `Você é um analista de estrutura e copy para redes sociais médicas.
Você vai receber uma imagem (print de um post/carrossel) ou um texto de legenda que é uma peça
QUE O PRÓPRIO MÉDICO já publicou antes e quer reaproveitar como modelo pra novos temas. Como é
autoria do próprio médico, você pode (e deve) ser bem mais fiel ao original — não precisa
abstrair tudo, o objetivo é permitir uma adaptação próxima, só trocando o suficiente pra não
ficar um clone exato quando o tema mudar.

Descreva, em um único parágrafo estruturado:
1. Formato: quantos slides/frames (se for carrossel), proporção, tipo de post.
2. Gancho: o TIPO de frase usada (pergunta, afirmação de choque, dado numérico) E a cadência/
   ritmo real da frase original — pode citar a estrutura sintática (ex: "frase curta de impacto
   seguida de pergunta retórica"), mas troque o assunto específico por um placeholder genérico.
3. Progressão: como a informação evolui de slide a slide ou parágrafo a parágrafo, incluindo
   frases de transição ou conectores que o médico costuma usar (pode citar esses conectores/
   expressões de transição literalmente — são o "jeito de falar" dele, não o conteúdo específico).
4. Estilo visual: paleta de cores predominante, estilo de tipografia (serifada/sem serifa, peso,
   tamanho), uso de espaço em branco, ícones/elementos gráficos, hierarquia visual entre título e corpo.
5. Estilo do fechamento/CTA: tom e, se fizer sentido, o texto aproximado do CTA que o médico usa
   (pode ser bem próximo do original, já que é autoria dele mesmo).

REGRA: troque sempre o TEMA/assunto médico específico e qualquer dado clínico concreto (isso muda
pra cada novo conteúdo) — mas o jeito de escrever, os conectores e a cadência de frase podem ficar
bem próximos do original, já que pertencem ao próprio médico. Retorne só o parágrafo descritivo,
sem markdown, sem título.`;

// Transcrição literal (OCR-like) do texto visível na imagem — só chamada quando a
// peça é do próprio médico. Usa OpenAI (gpt-4o) em vez de Claude de propósito: é uma
// segunda leitura independente, e a equipe reportou fidelidade melhor pra transcrição
// literal de texto em imagem nesse modelo especificamente.
async function extractLiteralCopyOpenAI(openaiKey: string, base64: string, mediaType: string): Promise<string | null> {
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcreva EXATAMENTE todo o texto visível nesta imagem (post ou carrossel), na ordem em que aparece, slide por slide se houver mais de um. Não resuma, não corrija, não comente — só o texto literal, palavra por palavra. Se não houver texto legível, responda apenas "SEM_TEXTO".',
            },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
          ],
        }],
      }),
    });
    if (!r.ok) { console.warn('[analyze-reference-style] openai', r.status, await r.text()); return null; }
    const data = await r.json();
    const text = (data.choices?.[0]?.message?.content ?? '').trim();
    if (!text || text === 'SEM_TEXTO') return null;
    return text.slice(0, 4000);
  } catch (e) {
    console.warn('[analyze-reference-style] openai failed', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { image_path, text, format_hint, source_ownership } = await req.json();
    if (!image_path && !text) return json({ error: 'Envie image_path ou text' }, 400);
    if (image_path && !image_path.startsWith(`${userId}/`)) return json({ error: 'Invalid image_path' }, 400);

    const isOwn = source_ownership === 'own';
    const SYSTEM = isOwn ? SYSTEM_OWN : SYSTEM_OTHER;

    const content: any[] = [];
    let imageBase64: string | null = null;
    let imageMediaType = 'image/jpeg';
    if (image_path) {
      const { data: blob, error: dlErr } = await supabase.storage.from('reference-images').download(image_path);
      if (dlErr || !blob) return json({ error: `download failed: ${dlErr?.message}` }, 400);
      const buf = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      imageBase64 = btoa(binary);
      imageMediaType = blob.type || 'image/jpeg';
      content.push({ type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } });
      content.push({ type: 'text', text: `Formato indicado pelo médico: ${format_hint ?? 'carousel'}. Analise a estrutura desta imagem.` });
    } else {
      content.push({ type: 'text', text: `Formato indicado pelo médico: ${format_hint ?? 'carousel'}. Analise a estrutura deste texto:\n\n${String(text).slice(0, 4000)}` });
    }

    // Estrutura (Claude) e, se for peça própria + imagem, copy literal (OpenAI) em paralelo.
    const structurePromise = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
      }),
    });
    const literalCopyPromise = (isOwn && imageBase64 && openaiKey)
      ? extractLiteralCopyOpenAI(openaiKey, imageBase64, imageMediaType)
      : Promise.resolve(isOwn && text ? String(text).slice(0, 4000) : null);

    const [r, extractedCopy] = await Promise.all([structurePromise, literalCopyPromise]);
    if (!r.ok) {
      const t = await r.text();
      return json({ error: `anthropic error: ${t.slice(0, 500)}` }, 502);
    }
    const data = await r.json();
    const structure = (data.content?.[0]?.text ?? '').trim();
    if (!structure) return json({ error: 'Resposta vazia do modelo' }, 502);

    return json({ structure_description: structure, extracted_copy: extractedCopy });
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
