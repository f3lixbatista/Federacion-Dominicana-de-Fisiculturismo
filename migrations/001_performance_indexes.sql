-- ============================================================
-- FDFF — Migración de índices de rendimiento
-- Aplicar en: Supabase Dashboard → SQL Editor
-- Todos los índices son CONCURRENT (sin lock de escritura)
-- ============================================================

-- ─── ATLETAS ────────────────────────────────────────────────
-- Búsqueda por estado de afiliación (inscripcionPage, listarAtletas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_atletas_estatus
    ON atletas (estatus_afiliacion);

-- Búsqueda por IDFDFF (siguienteIdfdff, ficha atleta)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_atletas_idfdff
    ON atletas (idfdff) WHERE idfdff LIKE 'FDFF-%';

-- Búsqueda por nombre (typeahead en inscripción asistida)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_atletas_nombre
    ON atletas (nombre text_pattern_ops);

-- Búsqueda por cédula (scanner QR, backstage)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_atletas_cedula
    ON atletas (cedula);

-- Filtro por preparador (panel coach)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_atletas_preparador
    ON atletas (preparador_id) WHERE preparador_id IS NOT NULL;

-- ─── COMPETIDORES ────────────────────────────────────────────
-- JOIN más frecuente: por evento (dashboard, auditoría, backstage)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competidores_evento
    ON competidores (id_evento);

-- JOIN por categoría del evento (mesa de cómputo, dorsaleo)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competidores_evento_cat
    ON competidores (evento_cat_id);

-- Combinado: evento + categoría + estado pesaje (inscripción asistida)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competidores_evento_cat_pesaje
    ON competidores (id_evento, evento_cat_id, estatus_pesaje);

-- Dorsal por evento (backstage, monitor MC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competidores_dorsal
    ON competidores (id_evento, numero_atleta) WHERE numero_atleta IS NOT NULL;

-- Comprobantes pendientes de validar (inscripcionPage)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competidores_comprobante
    ON competidores (id_evento, pago_validado)
    WHERE url_comprobante_pago IS NOT NULL;

-- ─── EVENTOS_CATEGORIAS ──────────────────────────────────────
-- JOIN por evento (todos los handlers de eventos)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_cats_evento
    ON eventos_categorias (evento_id);

-- Orden de secuencia (dorsaleo, backstage, monitor MC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_cats_orden
    ON eventos_categorias (evento_id, orden_secuencia_categoria);

-- Filtro por estatus_logistica (dashboard, centro de mando)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_cats_logistica
    ON eventos_categorias (evento_id, estatus_logistica);

-- ─── EVENTOS ─────────────────────────────────────────────────
-- Filtro por estado (inscripcionPage busca eventos activos)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_estado
    ON eventos (estado);

-- Listado cronológico (listarEventos, historico)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_fecha
    ON eventos (fecha_inicio DESC);

-- ─── CATEGORIAS ──────────────────────────────────────────────
-- Filtro por disciplina (validación de afinidad)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categorias_disciplina
    ON categorias (disciplina);

-- Filtro por sexo + modalidad (inscripción: filtro de categorías disponibles)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categorias_sexo_modalidad
    ON categorias (sexo, modalidad);

-- ─── PREPARADORES ────────────────────────────────────────────
-- Filtro por estatus (habilitar preparadores)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preparadores_estatus
    ON preparadores (estatus);

-- ─── VOTOS / MESA DE CÓMPUTO ─────────────────────────────────
-- Si existe tabla votos o votos_jueces — JOIN por evento_cat
-- Adaptar el nombre de tabla si es diferente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votos_evento_cat
    ON votos (evento_cat_id) WHERE EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'votos'
    );

-- ─── PROFILES / USUARIOS ─────────────────────────────────────
-- Filtro por rol (listar jueces, staff)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role
    ON profiles (role);

-- ─── ESTADÍSTICAS ────────────────────────────────────────────
-- Verificar si existe tabla historial_competitivo y añadir índice
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_historial_atleta
--     ON historial_competitivo (atleta_id, evento_id);

-- ============================================================
-- FUNCIÓN RPC: get_next_idfdff
-- Calcula el siguiente IDFDFF en PostgreSQL (evita traer todos los registros a Node.js)
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_idfdff(piso integer DEFAULT 2104)
RETURNS text
LANGUAGE sql STABLE AS $$
    SELECT 'FDFF-' || (
        COALESCE(
            MAX(CAST(SUBSTRING(idfdff FROM 6) AS integer)),
            piso
        ) + 1
    )
    FROM atletas
    WHERE idfdff ~ '^FDFF-[0-9]+$';
$$;
