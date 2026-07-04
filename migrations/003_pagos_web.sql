-- ======================================================================
-- 003_pagos_web.sql
-- Comprobantes de pago para afiliación web e inscripción con oferta
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → Run
-- ======================================================================

-- ── 1. Columnas de comprobante de membresía en atletas ─────────────────
ALTER TABLE atletas
  ADD COLUMN IF NOT EXISTS url_comprobante_membresia TEXT,
  ADD COLUMN IF NOT EXISTS fecha_subida_membresia     TIMESTAMPTZ;

-- ── 2. Columnas de comprobante de pago en competidores ─────────────────
ALTER TABLE competidores
  ADD COLUMN IF NOT EXISTS url_comprobante_pago TEXT,
  ADD COLUMN IF NOT EXISTS pago_validado         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_subida_pago     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observaciones_pago    TEXT;

-- ── 3. Crear buckets de storage ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'comprobantes-pago',
    'comprobantes-pago',
    true,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  ),
  (
    'comprobantes-membresia',
    'comprobantes-membresia',
    true,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- ── 4. Políticas de storage ────────────────────────────────────────────
-- (Las subidas se realizan desde el servidor con service_role, que bypasea RLS.
--  Las políticas de lectura pública son redundantes con public=true pero se
--  añaden por claridad y compatibilidad con clientes que usen el anon key.)

-- Bucket: comprobantes-pago
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Lectura publica comprobantes-pago'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Lectura publica comprobantes-pago"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'comprobantes-pago')
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Subida service-role comprobantes-pago'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Subida service-role comprobantes-pago"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'comprobantes-pago')
    $pol$;
  END IF;
END $$;

-- Bucket: comprobantes-membresia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Lectura publica comprobantes-membresia'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Lectura publica comprobantes-membresia"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'comprobantes-membresia')
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Subida service-role comprobantes-membresia'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Subida service-role comprobantes-membresia"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'comprobantes-membresia')
    $pol$;
  END IF;
END $$;

-- ── 5. Tabla de cuentas bancarias de la federación ────────────────────
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id             SERIAL PRIMARY KEY,
  banco          TEXT NOT NULL,
  numero_cuenta  TEXT NOT NULL,
  tipo_cuenta    TEXT NOT NULL DEFAULT 'corriente', -- corriente|ahorros|inversion
  titular        TEXT NOT NULL,
  moneda         TEXT NOT NULL DEFAULT 'RD$',       -- RD$|USD
  identificacion TEXT NOT NULL,                     -- Cédula o RNC del titular
  activa         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── FIN ────────────────────────────────────────────────────────────────
