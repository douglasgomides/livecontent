## Objetivo
Trocar `mockPipeline.ts` pelo novo `src/lib/pipeline.ts` fornecido, mantendo o app 100% frontend. Como não há backend agora, as chamadas Claude/Whisper ficam **atrás de uma flag** e caem em **fallback mock determinístico** sempre — pronto para você plugar a API quando decidir o backend.

## Ajustes necessários no arquivo colado

O código veio com problemas que impedem compilar/rodar; corrijo tudo ao portar:

### 1. TypeScript quebrado
- `Record` sem tipo genérico → `Record<ContentFormat, string>`, `Record<Topic['funnelStage'], string>`.
- Retornos `Promise` sem genérico → `Promise<ContentPiece[]>`, `Promise<string>`, `Promise<Topic[]>`.
- `PromiseFulfilledResult` sem genérico → `PromiseFulfilledResult<ContentPiece>`.

### 2. Segurança / viabilidade
- Chamada direta a `api.anthropic.com` do browser **não funciona** (CORS bloqueia) e vazaria chave. Envolvo `callClaude` numa checagem `AI_ENABLED` (constante `false` por padrão). Enquanto `false`, nunca faz fetch — vai direto ao fallback.
- Removo `VITE_OPENAI_API_KEY` do `transcribeAudio`. Enquanto `AI_ENABLED=false`, retorna uma transcrição-placeholder (igual ao mock atual).
- Adiciono um comentário no topo explicando exatamente o que trocar quando você tiver backend (Lovable Cloud ou proxy próprio): substituir `callClaude`/`transcribeAudio` por chamadas ao seu endpoint. **Não** desmarcar `AI_ENABLED` direto no browser.
- Corrijo o id do modelo para um valor válido comentado (`claude-sonnet-4-5` como referência); irrelevante enquanto flag está desligada, mas evita confusão futura.

### 3. Templates com HTML/estruturas cortadas
O prompt de `website` veio com o HTML "chupado" pelo formatter (tags perdidas). Reescrevo o template usando placeholders `<h1>{titulo}</h1>` etc., mantendo a intenção original.

### 4. Compatibilidade com o app atual
- Mantenho a re-exportação `createBlankSession, seedPipeline, seedScience` do `mockPipeline` (o novo arquivo já faz isso).
- `generateContentFor` mantém a **mesma assinatura** que o `SessionDetail.tsx` já usa (`topic, formats, profile, science, brain, transcript`).
- `rescoreContent` é exportado.
- `scoreCFM` novo é mais rigoroso que o atual — pode reprovar peças que hoje passam. Aceitável (é o objetivo).

## Passos de implementação

1. **Criar `src/lib/pipeline.ts`** com o conteúdo colado, aplicando as correções 1–3 acima e a flag `AI_ENABLED = false`.
2. **Trocar imports** nos consumidores que hoje puxam de `@/lib/mockPipeline`:
   - `src/pages/SessionDetail.tsx` (usa `generateContentFor`, `seedPipeline`, `rescoreContent`).
   - Buscar outros usos com `rg "from '@/lib/mockPipeline'"` e migrar somente os que precisam das novas funções (transcrição/anonimização/extração de tópicos), mantendo o resto no `mockPipeline` via re-export.
3. **Manter `mockPipeline.ts` intocado** — `pipeline.ts` importa dele. Nada quebra.
4. **Não** adiciono variáveis `VITE_*` nem instalo SDKs — projeto continua puramente client-side.

## Fora de escopo
- Backend/edge functions/Lovable Cloud.
- Ativar chamadas reais para Claude/Whisper (fica pronto para o próximo turno quando você decidir o backend).
- Mudanças de UI, prompts do Brain Builder ou visual.

## Verificação
- `tsgo --noEmit` limpo.
- Fluxo de gravar → transcrição → anonimização → tópicos → gerar conteúdo continua funcionando (via fallback mock, idêntico ao comportamento atual).
- `scoreCFM` novo aplicado às peças geradas — checar 1 peça no `SessionDetail` para ver as flags novas.

## Como ativar depois (nota para você)
Quando decidir o backend, o único ponto de troca é:
- `callClaude` → `fetch('/api/ai/claude', ...)` (ou edge function Lovable Cloud).
- `transcribeAudio` → `fetch('/api/ai/transcribe', ...)`.
- Setar `AI_ENABLED = true`.
Nenhum outro arquivo do app precisa mudar.