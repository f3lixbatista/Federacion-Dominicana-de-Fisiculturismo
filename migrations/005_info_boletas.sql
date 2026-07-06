-- ======================================================================
-- 005_info_boletas.sql
-- Campo de información de boletas/entrada en eventos
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ======================================================================

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS info_boletas TEXT;

-- ── FIN ────────────────────────────────────────────────────────────────
