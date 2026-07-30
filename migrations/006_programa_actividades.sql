-- Tabla para actividades intercaladas en el programa del evento
-- (Premiaciones, recesos, protocolo, apertura, otros)
CREATE TABLE IF NOT EXISTS programa_actividades (
    id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    evento_id        uuid        REFERENCES eventos(id) ON DELETE CASCADE,
    tipo             text        NOT NULL DEFAULT 'otro',
    descripcion      text        NOT NULL DEFAULT '',
    orden_secuencia  integer     NOT NULL DEFAULT 0,
    created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prog_act_evento ON programa_actividades (evento_id, orden_secuencia);
