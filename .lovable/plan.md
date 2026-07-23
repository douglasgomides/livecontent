## Objetivo
Eliminar a classe de bugs "cannot read properties of undefined" causada por sessões antigas no `localStorage` que foram criadas antes dos campos atuais (`cfm`, `body`, `channel`, `rejected`, `topics`, `content`, `piiFindings`). Fazer isso de forma central, uma única vez, para que nenhuma página precise repetir defaults defensivos.

## O que fazer

### 1. Camada de normalização central — `src/lib/migrations.ts` (novo)
Funções puras que recebem dados possivelmente antigos e devolvem objetos válidos:

- `normalizePiece(piece)` — garante `format`, `channel` (via `FORMAT_CHANNEL`), `body: string`, `cfm: { score, flags: [] }`, `approved`, `rejected`, `meta`, `brainSignals`, `artwork.slides: []`, `externalPrompts: {}`.
- `normalizeTopic(topic)` — garante `id`, `title`, `summary`, `funnelStage`, `included`.
- `normalizeSession(session)` — garante arrays (`topics`, `content`, `piiFindings`), status válido, `source` default `recording`, `title`, `durationSec: number`, e passa cada peça/tópico pelos normalizadores acima.
- `SCHEMA_VERSION = 2` e chave `cc_schema_version` no localStorage.

### 2. Migração automática no boot — `src/lib/storage.ts`
- `loadSessions()` passa cada sessão por `normalizeSession` antes de retornar (defesa em runtime, custo desprezível).
- Nova `runMigrations()` chamada uma vez em `src/main.tsx`: lê versão atual, se `< SCHEMA_VERSION` reescreve `cc_sessions` normalizado e persiste `SCHEMA_VERSION`. Idempotente.
- `upsertSession` também normaliza antes de gravar (garante que dados novos entram limpos).

### 3. Remover defaults duplicados nas páginas
Como `loadSessions` agora devolve dados sempre válidos, limpar código defensivo redundante em:
- `src/pages/Approvals.tsx` — remover `normalizePiece` local (fica só o do módulo central se necessário).
- `src/pages/SessionDetail.tsx`, `src/pages/PublishQueue.tsx`, `src/pages/Calendar.tsx`, `src/pages/Library.tsx`, `src/pages/Dashboard.tsx` — remover `?.` e `|| []` que existirem só por causa de dados antigos, mantendo optional chaining onde é semanticamente correto (ex.: `session.science?.reference`).
- `src/lib/pieceStatus.ts` — simplificar acessos a `cfm.flags`.

### 4. Fallback de recuperação
Se `JSON.parse` falhar em `loadSessions`, logar e retornar `[]` (já faz). Adicionar `try/catch` por sessão dentro do map: uma sessão corrompida individual não derruba a lista inteira — é pulada com `console.warn`.

### 5. Ferramenta de diagnóstico em Settings
Em `src/pages/Settings.tsx`, adicionar seção "Dados locais":
- Contador de sessões / peças / peças bloqueadas.
- Botão "Revalidar dados" — chama `runMigrations({ force: true })` e mostra toast com quantas peças foram corrigidas.
- Botão "Exportar backup JSON" e "Limpar tudo" (com confirmação).

## Detalhes técnicos

- Nenhuma mudança nos tipos de `src/types/session.ts` — apenas garantir que instâncias em runtime respeitam o contrato.
- `runMigrations` é chamada uma única vez no boot; escreve a versão para não repetir trabalho.
- Ordem em `main.tsx`: `runMigrations()` antes do `createRoot().render(...)` para que nenhum componente monte com dados sujos.
- Custo: um pass O(n) sobre sessões no primeiro load pós-deploy; nulo depois.

## Fora de escopo
- Integrações reais de publicação, novos formatos de conteúdo, mudanças visuais. Somente robustez de dados.
