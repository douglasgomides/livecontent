-- Token por médico pra autenticar o webhook de ENTRADA (a automação própria
-- dele — Zapier/Make/n8n — chama esse endpoint quando um lead responde por
-- WhatsApp). Não é uma sessão de usuário autenticado, por isso um token
-- simples na URL em vez de JWT. Gerado automaticamente pra quem já tem linha
-- em doctor_settings; quem ainda não salvou nada ganha um ao salvar Ajustes
-- pela primeira vez (default da coluna).
alter table public.doctor_settings
  add column if not exists whatsapp_inbound_token text default encode(gen_random_bytes(16), 'hex');
update public.doctor_settings
  set whatsapp_inbound_token = encode(gen_random_bytes(16), 'hex')
  where whatsapp_inbound_token is null;

-- Histórico de conversa por lead (inbound = o que o lead mandou, outbound =
-- o que o médico aprovou e enviou) — só pra dar contexto à sugestão da IA e
-- pro médico ver o histórico no kanban. Nunca é a fonte de disparo — quem
-- dispara é sempre whatsapp_followups + aprovação explícita.
create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.lead_captures(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.lead_messages enable row level security;

create policy "lead_messages_own"
  on public.lead_messages for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists lead_messages_lead_idx
  on public.lead_messages (lead_id, created_at);

-- Sugestão da IA (rascunho de resposta fica em whatsapp_followups; aqui só a
-- ETAPA sugerida, com justificativa curta) — sempre um convite, nunca uma
-- mudança automática. O médico aplica com um clique ou ignora; nada aqui
-- altera o campo "status" sozinho.
alter table public.lead_captures add column if not exists suggested_status text;
alter table public.lead_captures add column if not exists suggested_status_reason text;
