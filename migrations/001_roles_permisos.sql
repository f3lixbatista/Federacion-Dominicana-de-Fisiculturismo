-- ══════════════════════════════════════════════════════════════
-- FDFF — Migración: Sistema de roles y permisos dinámicos
-- Ejecutar en Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        TEXT NOT NULL UNIQUE,
    descripcion   TEXT,
    color_badge   TEXT NOT NULL DEFAULT 'secondary',
    es_sistema    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de permisos por área
CREATE TABLE IF NOT EXISTS rol_permisos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    area           TEXT NOT NULL,
    puede_ver      BOOLEAN NOT NULL DEFAULT FALSE,
    puede_crear    BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar   BOOLEAN NOT NULL DEFAULT FALSE,
    puede_eliminar BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (rol_id, area)
);

-- Índice para búsquedas rápidas por área
CREATE INDEX IF NOT EXISTS idx_rol_permisos_area ON rol_permisos(area);

-- ── Datos iniciales: roles del sistema ───────────────────────
INSERT INTO roles (nombre, descripcion, color_badge, es_sistema) VALUES
  ('admin',       'Administrador — acceso total',              'danger',    TRUE),
  ('ejecutivo',   'Ejecutivo — gestión de eventos y atletas',  'warning',   TRUE),
  ('estadistico', 'Estadístico — mesa de cómputo y resultados','primary',   TRUE),
  ('juez',        'Juez — votación en competencia',            'info',      TRUE),
  ('atleta',      'Atleta — perfil e inscripción web',         'success',   TRUE),
  ('preparador',  'Preparador / Coach — panel de equipo',      'secondary', TRUE),
  ('fotografo',   'Fotógrafo — subida de fotos',               'secondary', TRUE),
  ('mc',          'Maestro de Ceremonias — monitor y DJ',      'secondary', TRUE),
  ('backstage',   'Backstage — control de acceso',             'secondary', TRUE),
  ('general',     'General — solo puede afiliarse',            'secondary', TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- ── Permisos iniciales (replica las reglas actuales del código) ──

-- Función auxiliar para insertar permisos
DO $$
DECLARE
    r_admin       UUID := (SELECT id FROM roles WHERE nombre = 'admin');
    r_ejecutivo   UUID := (SELECT id FROM roles WHERE nombre = 'ejecutivo');
    r_estadistico UUID := (SELECT id FROM roles WHERE nombre = 'estadistico');
    r_juez        UUID := (SELECT id FROM roles WHERE nombre = 'juez');
    r_atleta      UUID := (SELECT id FROM roles WHERE nombre = 'atleta');
    r_preparador  UUID := (SELECT id FROM roles WHERE nombre = 'preparador');
    r_fotografo   UUID := (SELECT id FROM roles WHERE nombre = 'fotografo');
    r_mc          UUID := (SELECT id FROM roles WHERE nombre = 'mc');
    r_backstage   UUID := (SELECT id FROM roles WHERE nombre = 'backstage');
    r_general     UUID := (SELECT id FROM roles WHERE nombre = 'general');
BEGIN

-- ── ATLETAS ──────────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'atletas', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'atletas', TRUE, TRUE, TRUE, FALSE),
  (r_estadistico, 'atletas', TRUE, TRUE, TRUE, FALSE),
  (r_juez,        'atletas', TRUE, FALSE, FALSE, FALSE),
  (r_atleta,      'atletas', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'atletas', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'atletas', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'atletas', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'atletas', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'atletas', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── EVENTOS ──────────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'eventos', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'eventos', TRUE, TRUE, TRUE, FALSE),
  (r_estadistico, 'eventos', TRUE, FALSE, TRUE, FALSE),
  (r_juez,        'eventos', TRUE, FALSE, FALSE, FALSE),
  (r_atleta,      'eventos', TRUE, FALSE, FALSE, FALSE),
  (r_preparador,  'eventos', TRUE, FALSE, FALSE, FALSE),
  (r_fotografo,   'eventos', TRUE, FALSE, FALSE, FALSE),
  (r_mc,          'eventos', TRUE, FALSE, FALSE, FALSE),
  (r_backstage,   'eventos', TRUE, FALSE, FALSE, FALSE),
  (r_general,     'eventos', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── INSCRIPCION ───────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'inscripcion', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'inscripcion', TRUE, TRUE, TRUE, FALSE),
  (r_estadistico, 'inscripcion', TRUE, TRUE, TRUE, FALSE),
  (r_juez,        'inscripcion', TRUE, FALSE, FALSE, FALSE),
  (r_atleta,      'inscripcion', TRUE, TRUE, FALSE, FALSE),
  (r_preparador,  'inscripcion', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'inscripcion', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'inscripcion', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'inscripcion', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'inscripcion', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── ESTADISTICAS ──────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'estadisticas', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'estadisticas', TRUE, FALSE, FALSE, FALSE),
  (r_estadistico, 'estadisticas', TRUE, TRUE, TRUE, FALSE),
  (r_juez,        'estadisticas', TRUE, TRUE, FALSE, FALSE),
  (r_atleta,      'estadisticas', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'estadisticas', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'estadisticas', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'estadisticas', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'estadisticas', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'estadisticas', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── CATEGORIAS ────────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'categorias', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'categorias', TRUE, TRUE, TRUE, FALSE),
  (r_estadistico, 'categorias', FALSE, FALSE, FALSE, FALSE),
  (r_juez,        'categorias', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'categorias', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'categorias', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'categorias', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'categorias', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'categorias', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'categorias', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── SOCIAL ───────────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'social', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'social', TRUE, TRUE, TRUE, FALSE),
  (r_estadistico, 'social', TRUE, FALSE, FALSE, FALSE),
  (r_juez,        'social', TRUE, TRUE, FALSE, FALSE),
  (r_atleta,      'social', TRUE, TRUE, FALSE, FALSE),
  (r_preparador,  'social', TRUE, TRUE, FALSE, FALSE),
  (r_fotografo,   'social', TRUE, TRUE, FALSE, FALSE),
  (r_mc,          'social', TRUE, TRUE, FALSE, FALSE),
  (r_backstage,   'social', TRUE, FALSE, FALSE, FALSE),
  (r_general,     'social', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── PREPARADORES ─────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'preparadores', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'preparadores', TRUE, TRUE, TRUE, FALSE),
  (r_estadistico, 'preparadores', FALSE, FALSE, FALSE, FALSE),
  (r_juez,        'preparadores', TRUE, FALSE, FALSE, FALSE),
  (r_atleta,      'preparadores', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'preparadores', TRUE, FALSE, FALSE, FALSE),
  (r_fotografo,   'preparadores', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'preparadores', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'preparadores', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'preparadores', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── ADMIN ─────────────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'admin', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'admin', FALSE, FALSE, FALSE, FALSE),
  (r_estadistico, 'admin', FALSE, FALSE, FALSE, FALSE),
  (r_juez,        'admin', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'admin', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'admin', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'admin', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'admin', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'admin', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'admin', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── FOTOGRAFO ─────────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'fotografo', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'fotografo', TRUE, TRUE, FALSE, FALSE),
  (r_estadistico, 'fotografo', FALSE, FALSE, FALSE, FALSE),
  (r_juez,        'fotografo', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'fotografo', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'fotografo', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'fotografo', TRUE, TRUE, FALSE, FALSE),
  (r_mc,          'fotografo', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'fotografo', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'fotografo', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── DJ / BROADCAST ────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'broadcast', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'broadcast', FALSE, FALSE, FALSE, FALSE),
  (r_estadistico, 'broadcast', TRUE, TRUE, TRUE, FALSE),
  (r_juez,        'broadcast', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'broadcast', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'broadcast', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'broadcast', TRUE, FALSE, FALSE, FALSE),
  (r_mc,          'broadcast', TRUE, TRUE, FALSE, FALSE),
  (r_backstage,   'broadcast', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'broadcast', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── BACKSTAGE ─────────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'backstage', TRUE, TRUE, TRUE, TRUE),
  (r_ejecutivo,   'backstage', TRUE, FALSE, FALSE, FALSE),
  (r_estadistico, 'backstage', TRUE, TRUE, FALSE, FALSE),
  (r_juez,        'backstage', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'backstage', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'backstage', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'backstage', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'backstage', TRUE, FALSE, FALSE, FALSE),
  (r_backstage,   'backstage', TRUE, FALSE, FALSE, FALSE),
  (r_general,     'backstage', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

END $$;
