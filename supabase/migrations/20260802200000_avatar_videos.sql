-- Integração com HeyGen: vídeo do médico falando o roteiro de uma peça, usando
-- o AVATAR CLONADO DELE PRÓPRIO (criado direto na conta HeyGen do médico, fora
-- desta ferramenta) — nunca um avatar de estoque genérico. Geração é sempre
-- SOB DEMANDA (botão por peça), nunca automática no pipeline, pra não gastar
-- crédito da API do médico em peça que ele nem vai aprovar.
--
-- Credenciais são POR MÉDICO (cada um tem sua própria conta/avatar HeyGen),
-- por isso ficam em doctor_settings — nunca um secret compartilhado da
-- plataforma como o ANTHROPIC_API_KEY.
alter table public.doctor_settings
  add column if not exists heygen_api_key text,
  add column if not exists heygen_avatar_id text,
  add column if not exists heygen_voice_id text;

-- Geração é assíncrona no lado do HeyGen (pode levar minutos) — status fica
-- aqui e o cliente faz polling leve enquanto 'processing', sem precisar de
-- cron: o médico só espera com a tela aberta, igual outras gerações da ferramenta.
create table if not exists public.avatar_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_piece_id uuid not null references public.content_pieces(id) on delete cascade,
  heygen_video_id text,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  video_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.avatar_videos enable row level security;

create policy "avatar_videos_own"
  on public.avatar_videos for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists avatar_videos_piece_idx
  on public.avatar_videos (content_piece_id, created_at desc);
