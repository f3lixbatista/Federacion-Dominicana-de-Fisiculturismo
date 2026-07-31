-- CRÍTICO: monto_total y uso_oferta faltaban en `competidores` (ninguna migración
-- tracked los eliminó — probablemente un ALTER TABLE manual accidental en el
-- dashboard de Supabase). Docenas de referencias en el código (inscripcionController.js
-- y adminController.js) asumían que existían: guardarInscripcionAsistida (inscripción
-- asistida real) fallaba con "column competidores.monto_total does not exist" en
-- CADA intento de registrar un atleta, y _buildListado (listados oficiales de
-- atletas/posiciones) fallaba silenciosamente (el error no se verificaba) devolviendo
-- siempre 0 participantes.
ALTER TABLE competidores
    ADD COLUMN IF NOT EXISTS monto_total NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS uso_oferta  BOOLEAN DEFAULT false;
