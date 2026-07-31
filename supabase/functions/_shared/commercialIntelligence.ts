// Extrai inteligência comercial (argumentos usados pelo médico, objeções do
// paciente, dores identificadas, resultado da oferta) da transcrição JÁ
// ANONIMIZADA de uma consulta real (recording/upload — nunca palestra, nota
// de voz solta, link importado ou science-to-content). Mesmo padrão de
// _shared/cfm.ts e _shared/patientSignals.ts: prompt fixo, JSON forçado,
// FALLBACK que nunca derruba o chamador (run-pipeline chama isso best-effort).
const MODEL = 'claude-sonnet-4-5';

const COMMERCIAL_SYSTEM = `Você é um analista de inteligência comercial especializado em consultas
médicas/de saúde com viés consultivo-comercial (procedimentos, tratamentos, planos, pacotes).

Analise a transcrição da consulta e extraia SOMENTE informações de natureza comercial — não
extraia informações clínicas, diagnósticos ou dados que identifiquem o paciente. Se qualquer nome,
apelido, endereço, contato ou outro dado identificável aparecer na transcrição (mesmo que a
anonimização tenha deixado passar), generalize só essa parte antes de incluir no resultado — nunca
repasse o dado identificável adiante.

Retorne SÓ um JSON no formato exato abaixo — sem markdown, sem texto fora do JSON:
{
  "houve_oferta_comercial": boolean,
  "resultado": "fechou" | "nao_fechou" | "indefinido" | "nao_se_aplica",
  "motivo_resultado": string ou null,
  "argumentos_utilizados": [{"argumento": string, "categoria": "autoridade|prova_social|urgencia|escassez|beneficio_funcional|beneficio_emocional|preco_condicao|garantia|comparacao|outro", "momento_da_consulta": "abertura|meio|fechamento", "reacao_percebida_do_paciente": "positiva|neutra|negativa|nao_identificavel"}],
  "objecoes_do_paciente": [{"objecao": string, "categoria": "preco|tempo|medo_dor|duvida_eficacia|precisa_pensar|terceiros_opiniao|outro", "como_foi_respondida": string ou null, "objecao_superada": boolean ou null}],
  "dores_identificadas": [{"dor": string, "categoria": "estetica|funcional|emocional|social|financeira|outro"}],
  "procedimentos_tratamentos_mencionados": [string],
  "condicoes_comerciais_mencionadas": {"preco_mencionado": boolean, "parcelamento_mencionado": boolean, "desconto_oferecido": boolean, "detalhes": string ou null},
  "proxima_acao_combinada": string ou null,
  "resumo_comercial": string
}

Regras:
- Nunca invente informação que não está na transcrição.
- Se não houver contexto comercial na consulta, retorne "houve_oferta_comercial": false, "resultado": "nao_se_aplica" e os arrays vazios.
- "resumo_comercial" tem no máximo 3 frases.
- Máximo 10 itens por array (argumentos, objeções, dores, procedimentos).`;

export interface CommercialArgument {
  argumento: string;
  categoria: string;
  momento_da_consulta: string;
  reacao_percebida_do_paciente: string;
}

export interface CommercialObjection {
  objecao: string;
  categoria: string;
  como_foi_respondida: string | null;
  objecao_superada: boolean | null;
}

export interface CommercialPain {
  dor: string;
  categoria: string;
}

export interface CommercialConditions {
  preco_mencionado: boolean;
  parcelamento_mencionado: boolean;
  desconto_oferecido: boolean;
  detalhes: string | null;
}

export interface CommercialIntelligenceRow {
  houve_oferta_comercial: boolean;
  resultado: 'fechou' | 'nao_fechou' | 'indefinido' | 'nao_se_aplica';
  motivo_resultado: string | null;
  argumentos_utilizados: CommercialArgument[];
  objecoes_paciente: CommercialObjection[];
  dores_identificadas: CommercialPain[];
  procedimentos_mencionados: string[];
  condicoes_comerciais: CommercialConditions;
  proxima_acao: string | null;
  resumo_comercial: string;
}

const FALLBACK: CommercialIntelligenceRow = {
  houve_oferta_comercial: false,
  resultado: 'nao_se_aplica',
  motivo_resultado: null,
  argumentos_utilizados: [],
  objecoes_paciente: [],
  dores_identificadas: [],
  procedimentos_mencionados: [],
  condicoes_comerciais: { preco_mencionado: false, parcelamento_mencionado: false, desconto_oferecido: false, detalhes: null },
  proxima_acao: null,
  resumo_comercial: '',
};

const VALID_RESULTADO = new Set(['fechou', 'nao_fechou', 'indefinido', 'nao_se_aplica']);
const VALID_ARG_CATEGORIA = new Set(['autoridade', 'prova_social', 'urgencia', 'escassez', 'beneficio_funcional', 'beneficio_emocional', 'preco_condicao', 'garantia', 'comparacao', 'outro']);
const VALID_MOMENTO = new Set(['abertura', 'meio', 'fechamento']);
const VALID_REACAO = new Set(['positiva', 'neutra', 'negativa', 'nao_identificavel']);
const VALID_OBJ_CATEGORIA = new Set(['preco', 'tempo', 'medo_dor', 'duvida_eficacia', 'precisa_pensar', 'terceiros_opiniao', 'outro']);
const VALID_DOR_CATEGORIA = new Set(['estetica', 'funcional', 'emocional', 'social', 'financeira', 'outro']);

export async function extractCommercialIntelligence(anthropicKey: string, anonymizedTranscript: string): Promise<CommercialIntelligenceRow> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 3000, system: COMMERCIAL_SYSTEM,
        messages: [{ role: 'user', content: anonymizedTranscript }],
      }),
    });
    if (!r.ok) { console.warn('[commercial-intel] anthropic', r.status); return FALLBACK; }
    const data = await r.json();
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(text);

    const resultado = VALID_RESULTADO.has(parsed.resultado) ? parsed.resultado : 'nao_se_aplica';

    const argumentos: CommercialArgument[] = Array.isArray(parsed.argumentos_utilizados)
      ? parsed.argumentos_utilizados.slice(0, 10).map((a: any) => ({
          argumento: String(a?.argumento || '').slice(0, 200),
          categoria: VALID_ARG_CATEGORIA.has(a?.categoria) ? a.categoria : 'outro',
          momento_da_consulta: VALID_MOMENTO.has(a?.momento_da_consulta) ? a.momento_da_consulta : 'meio',
          reacao_percebida_do_paciente: VALID_REACAO.has(a?.reacao_percebida_do_paciente) ? a.reacao_percebida_do_paciente : 'nao_identificavel',
        }))
      : [];

    const objecoes: CommercialObjection[] = Array.isArray(parsed.objecoes_do_paciente)
      ? parsed.objecoes_do_paciente.slice(0, 10).map((o: any) => ({
          objecao: String(o?.objecao || '').slice(0, 200),
          categoria: VALID_OBJ_CATEGORIA.has(o?.categoria) ? o.categoria : 'outro',
          como_foi_respondida: o?.como_foi_respondida ? String(o.como_foi_respondida).slice(0, 300) : null,
          objecao_superada: typeof o?.objecao_superada === 'boolean' ? o.objecao_superada : null,
        }))
      : [];

    const dores: CommercialPain[] = Array.isArray(parsed.dores_identificadas)
      ? parsed.dores_identificadas.slice(0, 10).map((d: any) => ({
          dor: String(d?.dor || '').slice(0, 200),
          categoria: VALID_DOR_CATEGORIA.has(d?.categoria) ? d.categoria : 'outro',
        }))
      : [];

    const procedimentos: string[] = Array.isArray(parsed.procedimentos_tratamentos_mencionados)
      ? parsed.procedimentos_tratamentos_mencionados.slice(0, 10).map((p: any) => String(p).slice(0, 120))
      : [];

    const cond = parsed.condicoes_comerciais_mencionadas ?? {};
    const condicoesComerciais: CommercialConditions = {
      preco_mencionado: !!cond.preco_mencionado,
      parcelamento_mencionado: !!cond.parcelamento_mencionado,
      desconto_oferecido: !!cond.desconto_oferecido,
      detalhes: cond.detalhes ? String(cond.detalhes).slice(0, 300) : null,
    };

    return {
      houve_oferta_comercial: !!parsed.houve_oferta_comercial,
      resultado,
      motivo_resultado: parsed.motivo_resultado ? String(parsed.motivo_resultado).slice(0, 300) : null,
      argumentos_utilizados: argumentos,
      objecoes_paciente: objecoes,
      dores_identificadas: dores,
      procedimentos_mencionados: procedimentos,
      condicoes_comerciais: condicoesComerciais,
      proxima_acao: parsed.proxima_acao_combinada ? String(parsed.proxima_acao_combinada).slice(0, 300) : null,
      resumo_comercial: String(parsed.resumo_comercial || '').slice(0, 600),
    };
  } catch (e) {
    console.warn('[commercial-intel] failed', e);
    return FALLBACK;
  }
}
