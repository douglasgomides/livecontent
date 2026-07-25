-- ============ REFERENCE STYLES (estrutura de posts/carrosséis de referência) ============
CREATE TABLE public.reference_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Referência',
  format_hint TEXT NOT NULL DEFAULT 'carousel',
  source_type TEXT NOT NULL DEFAULT 'image' CHECK (source_type IN ('image', 'text')),
  source_image_path TEXT,
  source_text TEXT,
  structure_description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reference_styles TO authenticated;
GRANT ALL ON public.reference_styles TO service_role;
ALTER TABLE public.reference_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reference styles" ON public.reference_styles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX reference_styles_user ON public.reference_styles(user_id, created_at DESC);
CREATE TRIGGER reference_styles_updated_at BEFORE UPDATE ON public.reference_styles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Bucket privado pras imagens de referência que o médico sobe.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reference-images', 'reference-images', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "reference images own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reference-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "reference images own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reference-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "reference images own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reference-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Liga uma peça de conteúdo à referência de estilo usada (opcional, rastreabilidade).
ALTER TABLE public.content_pieces ADD COLUMN reference_style_id UUID REFERENCES public.reference_styles(id) ON DELETE SET NULL;
