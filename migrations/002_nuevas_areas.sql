-- ══════════════════════════════════════════════════════════════════════
-- FDFF — Patch 002: Nuevas áreas granulares de permisos
-- Ejecutar DESPUÉS de 001_roles_permisos.sql (ya ejecutado)
-- ══════════════════════════════════════════════════════════════════════

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

-- ── PESAJE: inscripción asistida, registro y pesaje del día ──────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'pesaje', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'pesaje', TRUE,  TRUE,  TRUE,  FALSE),
  (r_estadistico, 'pesaje', TRUE,  TRUE,  TRUE,  FALSE),
  (r_juez,        'pesaje', TRUE,  FALSE, FALSE, FALSE),
  (r_atleta,      'pesaje', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'pesaje', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'pesaje', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'pesaje', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'pesaje', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'pesaje', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── PANEL_JUECES: configurar panel de jueces ──────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'panel_jueces', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'panel_jueces', TRUE,  TRUE,  TRUE,  FALSE),
  (r_estadistico, 'panel_jueces', TRUE,  FALSE, FALSE, FALSE),
  (r_juez,        'panel_jueces', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'panel_jueces', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'panel_jueces', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'panel_jueces', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'panel_jueces', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'panel_jueces', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'panel_jueces', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── PREPARACION: preparación de evento ───────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'preparacion', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'preparacion', TRUE,  TRUE,  TRUE,  FALSE),
  (r_estadistico, 'preparacion', TRUE,  FALSE, TRUE,  FALSE),
  (r_juez,        'preparacion', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'preparacion', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'preparacion', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'preparacion', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'preparacion', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'preparacion', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'preparacion', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── PROGRAMA: programa de competencia / centro de mando ──────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'programa', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'programa', TRUE,  TRUE,  TRUE,  FALSE),
  (r_estadistico, 'programa', TRUE,  TRUE,  TRUE,  FALSE),
  (r_juez,        'programa', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'programa', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'programa', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'programa', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'programa', TRUE,  FALSE, FALSE, FALSE),
  (r_backstage,   'programa', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'programa', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── STAFF: administrar personal ──────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'staff', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'staff', FALSE, FALSE, FALSE, FALSE),
  (r_estadistico, 'staff', FALSE, FALSE, FALSE, FALSE),
  (r_juez,        'staff', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'staff', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'staff', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'staff', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'staff', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'staff', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'staff', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── NOTICIAS: publicar comunicados oficiales ──────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'noticias', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'noticias', TRUE,  TRUE,  TRUE,  FALSE),
  (r_estadistico, 'noticias', TRUE,  FALSE, FALSE, FALSE),
  (r_juez,        'noticias', TRUE,  FALSE, FALSE, FALSE),
  (r_atleta,      'noticias', TRUE,  FALSE, FALSE, FALSE),
  (r_preparador,  'noticias', TRUE,  FALSE, FALSE, FALSE),
  (r_fotografo,   'noticias', TRUE,  FALSE, FALSE, FALSE),
  (r_mc,          'noticias', TRUE,  FALSE, FALSE, FALSE),
  (r_backstage,   'noticias', TRUE,  FALSE, FALSE, FALSE),
  (r_general,     'noticias', TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── PRODUCCION: producción de espectáculo (LED wall, coordinación) ───
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'produccion', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'produccion', FALSE, FALSE, FALSE, FALSE),
  (r_estadistico, 'produccion', TRUE,  FALSE, FALSE, FALSE),
  (r_juez,        'produccion', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'produccion', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'produccion', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'produccion', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'produccion', TRUE,  FALSE, FALSE, FALSE),
  (r_backstage,   'produccion', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'produccion', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── DJ: DJ Virtual ───────────────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'dj', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'dj', FALSE, FALSE, FALSE, FALSE),
  (r_estadistico, 'dj', TRUE,  TRUE,  FALSE, FALSE),
  (r_juez,        'dj', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'dj', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'dj', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'dj', TRUE,  FALSE, FALSE, FALSE),
  (r_mc,          'dj', TRUE,  TRUE,  FALSE, FALSE),
  (r_backstage,   'dj', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'dj', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── VMD: panel director de video y multimedia ─────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'vmd', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'vmd', FALSE, FALSE, FALSE, FALSE),
  (r_estadistico, 'vmd', TRUE,  TRUE,  TRUE,  FALSE),
  (r_juez,        'vmd', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'vmd', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'vmd', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'vmd', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'vmd', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'vmd', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'vmd', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── MONITOR_MC: monitor del maestro de ceremonias (solo lectura) ──────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'monitor_mc', TRUE,  FALSE, FALSE, FALSE),
  (r_ejecutivo,   'monitor_mc', FALSE, FALSE, FALSE, FALSE),
  (r_estadistico, 'monitor_mc', TRUE,  FALSE, FALSE, FALSE),
  (r_juez,        'monitor_mc', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'monitor_mc', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'monitor_mc', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'monitor_mc', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'monitor_mc', TRUE,  FALSE, FALSE, FALSE),
  (r_backstage,   'monitor_mc', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'monitor_mc', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── COMPUTO: mesa técnica, cómputo de resultados, gestión de absolutos ─
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'computo', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'computo', TRUE,  FALSE, FALSE, FALSE),
  (r_estadistico, 'computo', TRUE,  TRUE,  TRUE,  FALSE),
  (r_juez,        'computo', TRUE,  TRUE,  FALSE, FALSE),
  (r_atleta,      'computo', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'computo', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'computo', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'computo', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'computo', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'computo', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── REPORTES: reporte oficial, impresión de diplomas y certificados ───
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'reportes', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'reportes', TRUE,  FALSE, FALSE, FALSE),
  (r_estadistico, 'reportes', TRUE,  TRUE,  FALSE, FALSE),
  (r_juez,        'reportes', TRUE,  FALSE, FALSE, FALSE),
  (r_atleta,      'reportes', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'reportes', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'reportes', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'reportes', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'reportes', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'reportes', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── CIERRE: cerrar competencia ────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'cierre', TRUE,  FALSE, TRUE,  FALSE),
  (r_ejecutivo,   'cierre', TRUE,  FALSE, TRUE,  FALSE),
  (r_estadistico, 'cierre', FALSE, FALSE, FALSE, FALSE),
  (r_juez,        'cierre', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'cierre', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'cierre', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'cierre', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'cierre', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'cierre', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'cierre', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── FINANZAS: cobro manual, cierre de caja, localizador de pagos ─────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'finanzas', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'finanzas', TRUE,  TRUE,  TRUE,  FALSE),
  (r_estadistico, 'finanzas', TRUE,  FALSE, FALSE, FALSE),
  (r_juez,        'finanzas', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'finanzas', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'finanzas', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'finanzas', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'finanzas', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'finanzas', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'finanzas', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── NOTIFICACIONES: envío de notificaciones push ─────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'notificaciones', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'notificaciones', FALSE, FALSE, FALSE, FALSE),
  (r_estadistico, 'notificaciones', FALSE, FALSE, FALSE, FALSE),
  (r_juez,        'notificaciones', FALSE, FALSE, FALSE, FALSE),
  (r_atleta,      'notificaciones', FALSE, FALSE, FALSE, FALSE),
  (r_preparador,  'notificaciones', FALSE, FALSE, FALSE, FALSE),
  (r_fotografo,   'notificaciones', FALSE, FALSE, FALSE, FALSE),
  (r_mc,          'notificaciones', FALSE, FALSE, FALSE, FALSE),
  (r_backstage,   'notificaciones', FALSE, FALSE, FALSE, FALSE),
  (r_general,     'notificaciones', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

-- ── RANKING: ranking de teams ─────────────────────────────────────────
INSERT INTO rol_permisos (rol_id, area, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
  (r_admin,       'ranking', TRUE,  TRUE,  TRUE,  TRUE),
  (r_ejecutivo,   'ranking', TRUE,  FALSE, FALSE, FALSE),
  (r_estadistico, 'ranking', TRUE,  FALSE, FALSE, FALSE),
  (r_juez,        'ranking', TRUE,  FALSE, FALSE, FALSE),
  (r_atleta,      'ranking', TRUE,  FALSE, FALSE, FALSE),
  (r_preparador,  'ranking', TRUE,  FALSE, FALSE, FALSE),
  (r_fotografo,   'ranking', TRUE,  FALSE, FALSE, FALSE),
  (r_mc,          'ranking', TRUE,  FALSE, FALSE, FALSE),
  (r_backstage,   'ranking', TRUE,  FALSE, FALSE, FALSE),
  (r_general,     'ranking', TRUE,  FALSE, FALSE, FALSE)
ON CONFLICT (rol_id, area) DO NOTHING;

END $$;
