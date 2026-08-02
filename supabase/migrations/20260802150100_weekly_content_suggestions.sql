-- Fecha o loop: agrega objeções reais de pacientes (patient_signals) numa
-- sugestão de tema de conteúdo por semana. Uma linha por (médico, semana) —
-- estável enquanto a página é revisitada, e rastreável (pendente/gerada/
-- dispensada) sem precisar recalcular a cada carregamento.
CREATE TABLE public.weekly_content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  category TEXT NOT NULL,
  signal_count INT NOT NULL,
  example_label TEXT NOT NULL,
  action_tip TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'dismissed')),
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_content_suggestions TO authenticated;
GRANT ALL ON public.weekly_content_suggestions TO service_role;
ALTER TABLE public.weekly_content_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekly suggestions" ON public.weekly_content_suggestions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
