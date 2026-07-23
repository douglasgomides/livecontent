## Objetivo
Transformar o pós-geração de "3 páginas separadas que não conversam" em um **fluxo linear com estado explícito**: peça nasce rascunho → aprova → agenda → publica → arquiva. Cada tela mostra o que é responsabilidade dela e as transições são um clique.

## Estado atual (o que já funciona)
- `Approvals.tsx`: agrupa pendentes por canal, aprova em lote por canal, lista bloqueadas CFM.
- `Calendar.tsx`: 473 linhas, mês/semana, agendamento manual e auto-preenchimento — o mais completo.
- `PublishQueue.tsx`: board de status simples, marcar publicado manual.
- `Library.tsx`: arquivo geral.

## Lacunas que este plano resolve
1. **Aprovar não empurra pra frente.** Aprovar em Approvals não sugere agendar nem envia pra fila. Cada peça fica órfã.
2. **Peça bloqueada CFM não pode ser editada.** Só link "abrir consulta". Fricção alta.
3. **Fila e Calendário são desconectados.** Peça agendada não aparece na fila; peça na fila não tem data.
4. **Rejeitar não existe.** Só aprovar ou ignorar. Sem sinal negativo pra melhoria futura da Brain.
5. **Nenhuma visão consolidada por peça.** Não dá pra ver "onde está esta peça no fluxo" sem entrar na consulta.

## Mudanças

### 1. Modelo de estado unificado (`src/types/session.ts` + `src/lib/storage.ts`)
Adicionar campo `pipelineStatus` em `ContentPiece`:
```
draft | approved | scheduled | published | rejected | blocked
```
Derivado de: `approved`, `cfm.flags.severity==='block'`, entrada no `scheduleStorage`, entrada em `publishQueue`. Helper `getPieceStatus(piece, session)` centraliza a leitura — nenhum campo novo persistido inicialmente, só derivação.

Adicionar `rejectedReason?: string` opcional em `ContentPiece` para capturar motivo.

### 2. `Approvals.tsx` — turbinar
- **Rejeitar peça** com motivo curto (dropdown: "fora de tom", "assunto sensível", "não gostei do gancho", "outro"). Armazena em `rejectedReason` e marca `approved: false` permanentemente (some da fila de pendentes).
- **Editar inline**: botão "Editar" abre `Textarea` com `piece.body` no próprio card, sem sair da página. Salvar re-roda `scoreCFM` (via `rescoreContent`) — libera peças CFM-bloqueadas sem obrigar navegação.
- **Aprovar + agendar** (ação secundária): aprovar já cria entrada no `scheduleStorage` com slot sugerido da próxima semana. Toast informa o horário.
- **Aprovar + enfileirar**: aprovar + criar `PublishJob`. Combinável com agendar.
- **Filtro adicional**: por origem (Consulta, Voice note, Audio livre, Link) além de canal.
- **Preview expandido**: click no card abre `Dialog` com body completo + artwork thumbnail + flags CFM detalhadas.

### 3. `PublishQueue.tsx` — ligar ao Calendário
- Cada job mostra `scheduledFor` quando existir (badge de data).
- Botão "Copiar tudo" por job: monta clipboard com body + prompts externos + link da arte gerada.
- Ação nova: "Agendar" quando job não tem data (abre mini date-picker inline).
- Ação nova: "Marcar como falhou" com motivo curto — muda pra `failed` + `message`.
- Auto-transition: quando `scheduledFor <= now`, badge muda pra "pronto pra sair" (vermelho suave).

### 4. `Calendar.tsx` — reflection do estado
- Peça no calendário mostra pastilha de status (agendada, publicada, falhou) puxando de `publishQueue`.
- Click em peça agendada oferece "Marcar publicada" direto (cria/atualiza job).
- Filtro por status no toolbar.

### 5. Nova página `/app/piece/:id` (opcional dentro do plano)
Rota que centraliza uma única peça: body, arte, prompts externos, status, histórico (aprovada em X, agendada Y, publicada Z). Substitui a necessidade de "abrir consulta" pra editar uma peça isolada. Se cortar escopo, faz `Dialog` no lugar (mais simples, escolho `Dialog` como default).

### 6. Dashboard — bloco de saúde do fluxo
Cards novos:
- Rascunhos aguardando aprovação
- Aprovados sem agendamento
- Agendados nos próximos 7 dias
- Bloqueados CFM (com link direto pra editar)

## Fora de escopo
- Publicar de verdade em IG/LinkedIn/etc (fica pra fase de integrações).
- Aprendizado da Brain a partir de rejeições (só armazenar motivo por enquanto).
- Analytics de performance pós-publicação.
- Alterar `mockPipeline` / `pipeline.ts`.

## Verificação
- `tsgo --noEmit` limpo.
- Fluxo teste: gerar consulta mock → aprovar 3 peças → agendar 2 na semana → ver as 3 no Publish Queue → 2 com data, 1 sem → marcar 1 publicada no Calendar → refletir em Queue e Dashboard.
- Rejeitar 1 peça com motivo → some da fila de pendentes, aparece no `SessionDetail`.
- Editar peça CFM-bloqueada em Approvals → CFM re-score → peça libera.

## Ordem de implementação
1. `getPieceStatus` helper + tipo `PipelineStatus` (base para o resto).
2. Approvals: rejeitar + editar inline + preview dialog.
3. Approvals: aprovar+agendar / aprovar+enfileirar.
4. PublishQueue: badges de data + agendar inline + copy-all.
5. Calendar: status badges + marcar publicada.
6. Dashboard: bloco de saúde do fluxo.