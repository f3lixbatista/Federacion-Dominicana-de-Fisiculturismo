-- Roster de invitados especiales a mencionar por el MC en la apertura del evento:
-- jueces que no están en el panel inicial, staff, patrocinadores y personalidades.
-- Los jueces del panel inicial NO se duplican aquí — se leen en vivo desde
-- panel_sillas_jueces/paneles_jueces al armar el guion/impresión.
CREATE TABLE IF NOT EXISTS programa_invitados (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    evento_id   uuid        REFERENCES eventos(id) ON DELETE CASCADE,
    categoria   text        NOT NULL CHECK (categoria IN ('juez_no_panel', 'staff', 'patrocinador', 'personalidad')),
    nombre      text        NOT NULL,
    detalle     text        DEFAULT '',
    orden       integer     NOT NULL DEFAULT 0,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prog_invitados_evento ON programa_invitados (evento_id, categoria, orden);
