-- ============ EVIDENCE SOURCES (biblioteca de evidência científica por médico) ============
CREATE TYPE public.evidence_level AS ENUM (
  'meta_analysis', 'systematic_review', 'rct', 'cohort', 'case_control',
  'case_series', 'guideline', 'expert_opinion', 'other'
);

CREATE TABLE public.evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT,
  journal TEXT,
  year INTEGER,
  url TEXT,
  pubmed_id TEXT,
  evidence_level public.evidence_level NOT NULL DEFAULT 'other',
  summary TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'pubmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_sources TO authenticated;
GRANT ALL ON public.evidence_sources TO service_role;
ALTER TABLE public.evidence_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own evidence" ON public.evidence_sources FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX evidence_user ON public.evidence_sources(user_id, created_at DESC);
CREATE TRIGGER evidence_updated_at BEFORE UPDATE ON public.evidence_sources
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Liga uma peça de conteúdo às fontes realmente citadas nela (transparência/rastreabilidade)
ALTER TABLE public.content_pieces ADD COLUMN evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
