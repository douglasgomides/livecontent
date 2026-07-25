
-- ============ ENUMS ============
CREATE TYPE public.session_status AS ENUM (
  'recording','transcribing','anonymizing','anonymization_review',
  'extracting_topics','topics_review','generating_content','ready','failed'
);
CREATE TYPE public.session_source AS ENUM (
  'recording','upload','voice_note','science','audio_livre','link'
);
CREATE TYPE public.content_format AS ENUM (
  'reel','carousel','caption','stories','linkedin',
  'blog','youtube','tiktok','podcast','gmb','doctoralia','website'
);
CREATE TYPE public.content_channel AS ENUM (
  'instagram','linkedin','youtube','tiktok','blog','gmb','doctoralia','website','podcast'
);
CREATE TYPE public.publish_status AS ENUM (
  'queued','publishing','published','needs_connection','downloaded','failed'
);

-- ============ updated_at trigger fn ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ BRAINS ============
CREATE TABLE public.brains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor JSONB NOT NULL DEFAULT '{}'::jsonb,
  patient JSONB NOT NULL DEFAULT '{}'::jsonb,
  brand JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brains TO authenticated;
GRANT ALL ON public.brains TO service_role;
ALTER TABLE public.brains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brain" ON public.brains FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER brains_updated_at BEFORE UPDATE ON public.brains
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ SESSIONS ============
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source public.session_source NOT NULL DEFAULT 'recording',
  title TEXT NOT NULL DEFAULT 'Sessão',
  duration_sec INTEGER NOT NULL DEFAULT 0,
  status public.session_status NOT NULL DEFAULT 'recording',
  audio_path TEXT,
  raw_transcript TEXT,
  anonymized_transcript TEXT,
  pii_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  science JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX sessions_user_created ON public.sessions(user_id, created_at DESC);
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ TOPICS ============
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  funnel_stage TEXT NOT NULL DEFAULT 'C1',
  included BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own topics" ON public.topics FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX topics_session ON public.topics(session_id);
CREATE TRIGGER topics_updated_at BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ CONTENT PIECES ============
CREATE TABLE public.content_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  format public.content_format NOT NULL,
  channel public.content_channel NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  cfm JSONB NOT NULL DEFAULT '{"score":0,"flags":[]}'::jsonb,
  approved BOOLEAN NOT NULL DEFAULT false,
  rejected BOOLEAN NOT NULL DEFAULT false,
  rejected_reason TEXT,
  rejected_note TEXT,
  meta JSONB,
  brain_signals JSONB,
  artwork JSONB,
  external_prompts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_pieces TO authenticated;
GRANT ALL ON public.content_pieces TO service_role;
ALTER TABLE public.content_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pieces" ON public.content_pieces FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX pieces_session ON public.content_pieces(session_id);
CREATE INDEX pieces_user ON public.content_pieces(user_id, created_at DESC);
CREATE TRIGGER pieces_updated_at BEFORE UPDATE ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ PUBLISH JOBS ============
CREATE TABLE public.publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  piece_id UUID NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  channel public.content_channel NOT NULL,
  format public.content_format NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status public.publish_status NOT NULL DEFAULT 'queued',
  message TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publish_jobs TO authenticated;
GRANT ALL ON public.publish_jobs TO service_role;
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jobs" ON public.publish_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX jobs_user ON public.publish_jobs(user_id, scheduled_at NULLS LAST);
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.publish_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ DOCTOR SETTINGS (webhook URLs por canal) ============
CREATE TABLE public.doctor_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  webhooks JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferred_formats JSONB NOT NULL DEFAULT '["caption","carousel","reel","linkedin"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_settings TO authenticated;
GRANT ALL ON public.doctor_settings TO service_role;
ALTER TABLE public.doctor_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.doctor_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.doctor_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_pieces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.publish_jobs;

-- ============ Auto-create brain + settings on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.brains (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.doctor_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
