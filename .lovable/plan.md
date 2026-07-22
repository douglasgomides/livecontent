## 1. Nova promessa da Landing

Reposicionar de "uma semana de conteúdo" pra **máquina de conteúdo sempre ligada**, com a consulta como player principal e vários outros inputs orbitando.

**Nova headline**
> Sua máquina de conteúdo médico. Sempre ligada.
> Grave consultas, palestras, áudios de WhatsApp, aulas — e transforme em posts, Reels, carrosséis, blog, YouTube, podcast. Todo dia, sem parar de atender.

**Sub-copy curta:** "A consulta é o player principal. Palestra, aula, áudio solto, link do YouTube, Reel salvo — tudo vira conteúdo pronto, revisado eticamente, distribuído em vários canais."

**Nova seção "Tudo vira conteúdo"** (grid de 8 chips com ícone + label curta):
- Consulta gravada (destacado como principal)
- Áudio livre / voice note
- Aula ou palestra
- Áudio de WhatsApp
- Conversa gravada com colega
- Link do YouTube (transcrição)
- Link de Reel / TikTok (transcrição)
- Artigo / abstract científico

**Nova seção "Sai em todos os canais"** (grid horizontal):
Reel · Carrossel · Stories · Post estático · Blog · YouTube · TikTok · Podcast · Google Meu Negócio · Doctoralia · LinkedIn · Site

**Fluxo em 4 passos** (mantém o formato atual, muda o texto):
1. Capture — de qualquer fonte de áudio ou link.
2. Anonimize — PII fora antes de qualquer geração.
3. Multiplique — 1 input vira 10+ peças em canais diferentes.
4. Publique — aprove e mande, ou baixe arte pronta.

**CTA principal:** "Ligar a máquina" (em vez de "Começar agora").

**Rodapé:** manter linha de compliance.

Observação: os inputs "link YouTube", "link Reel/TikTok", "áudio de WhatsApp" e "conversa gravada" entram como **promessa na landing**, mas na v1 do app são cobertos pelos inputs que já existem (Upload de áudio aceita arquivo de WhatsApp; Áudio Livre cobre palestra/aula/conversa). Transcrição direta de link fica como "em breve" — não invento fluxo novo que não existe.

## 2. Calendário editorial

Nova página `/app/calendar` (item novo na sidebar, grupo Trabalho, entre Aprovações e Fila de publicação).

**Fonte de dados:** peças (`ContentPiece`) de todas as sessões + fila (`PublishJob`) do `publishQueue`. Sem backend — tudo do `localStorage`.

**Modelo de agendamento:**
- Nova estrutura `scheduledPosts` em `localStorage` (`src/lib/scheduleStorage.ts`) com `{ id, pieceId, sessionId, channel, format, title, scheduledFor: ISO, status: 'planned' | 'ready' | 'published' }`.
- Peça aprovada pode ser arrastada/atribuída a um dia+horário; peça publicada (via fila) aparece automaticamente marcada como `published` naquele dia.

**Views:**
- **Mês** (padrão desktop): grid 7×5, cada célula mostra até 3 chips coloridos por canal (Reel = coral, Carrossel = dourado, Blog = creme escuro, etc.), com contador "+N" se passar. Clique no dia abre drawer lateral com a lista completa.
- **Semana** (padrão mobile — viewport atual é 428px): lista vertical de 7 dias, cada dia como cartão com peças empilhadas.
- Toggle Mês / Semana no topo.

**Ações:**
- **Agendar peça:** botão "Agendar" em cada `ContentPieceCard` (aba Publicar já existe — adiciona ação "Agendar pra…" com date+time picker shadcn) e botão "+ Agendar peça" em cada dia do calendário (abre modal listando peças aprovadas não agendadas).
- **Mover:** clique num item agendado abre popover com "Mover pra outro dia", "Publicar agora" (empurra pro `publishQueue`), "Desagendar", "Abrir peça".
- **Sugestão de horário:** heurística simples por canal (Instagram/TikTok 12h e 19h; LinkedIn 8h; YouTube 18h; Blog/GMB 10h) — pré-preenche o time picker.

**Widgets no topo da página:**
- "Esta semana": X agendadas · Y publicadas · Z aprovadas sem data.
- Filtro por canal (multi-select).
- Botão "Auto-preencher semana" — pega peças aprovadas sem data, distribui nos próximos 7 dias respeitando 1–2 por dia por canal usando os horários sugeridos.

**Dashboard:** novo card "Próximas 7 publicações" mostrando as 7 mais próximas agendadas, com link "Ver calendário".

## Escopo técnico

- `src/pages/Landing.tsx` — reescrever hero, adicionar seções "Tudo vira conteúdo" e "Sai em todos os canais", trocar CTA.
- `index.html` — atualizar `<title>` e `<meta description>` pra bater com a nova promessa.
- `src/types/session.ts` — nova interface `ScheduledPost`.
- `src/lib/scheduleStorage.ts` — CRUD + `useSchedule` hook, sync automático com `publishQueue` (quando job vira `published`, marca schedule como `published`).
- `src/pages/Calendar.tsx` — página nova com views Mês/Semana, drawer de dia, modal de agendamento.
- `src/components/calendar/MonthGrid.tsx`, `WeekList.tsx`, `DayDrawer.tsx`, `ScheduleModal.tsx`.
- `src/components/session/PiecePublish.tsx` — adicionar botão "Agendar" ao lado de "Enviar pra fila".
- `src/pages/Dashboard.tsx` — card "Próximas publicações".
- `src/components/app/AppSidebar.tsx` — item "Calendário" (ícone `CalendarDays`), grupo Trabalho.
- `src/App.tsx` — rota `/app/calendar`.

## Fora de escopo

- Transcrição real de link do YouTube/Reel/TikTok (fica como promessa; implementação real depende de API).
- Publicação automática no horário agendado (frontend puro não roda cron; agendar = marcar no calendário e lembrar o médico. Botão "Publicar agora" empurra pra fila manualmente).
- Sincronização com Google Calendar / iCal.
