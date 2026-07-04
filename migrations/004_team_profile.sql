-- ======================================================================
-- 004_team_profile.sql
-- Perfil público de Team para preparadores registrados
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ======================================================================

-- ── 1. Columnas de perfil de Team en preparadores ─────────────────────
ALTER TABLE preparadores
  ADD COLUMN IF NOT EXISTS nombre_team     TEXT,
  ADD COLUMN IF NOT EXISTS foto_portada_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_perfil_url  TEXT,
  ADD COLUMN IF NOT EXISTS resena           TEXT;

-- ── 2. Bucket de storage para fotos del team ──────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos-team', 'fotos-team', true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Políticas de storage ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Lectura publica fotos-team') THEN
    EXECUTE $pol$ CREATE POLICY "Lectura publica fotos-team" ON storage.objects FOR SELECT USING (bucket_id = 'fotos-team') $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Subida fotos-team') THEN
    EXECUTE $pol$ CREATE POLICY "Subida fotos-team" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fotos-team') $pol$;
  END IF;
END $$;

-- ── FIN ────────────────────────────────────────────────────────────────
