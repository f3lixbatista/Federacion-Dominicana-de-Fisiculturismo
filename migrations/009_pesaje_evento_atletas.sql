-- Permite saber si un atleta ya fue pesado/medido para un evento especifico,
-- para bloquear el boton "PESAR" (evitar duplicados) y habilitar "EDITAR" en
-- su lugar. atletas.peso/estatura siguen siendo el valor vigente (compartido
-- con inscripcion.ejs); estas dos columnas solo marcan CUANDO/PARA QUE EVENTO
-- se confirmo ese valor por ultima vez.
ALTER TABLE atletas
    ADD COLUMN IF NOT EXISTS pesaje_evento_id UUID REFERENCES eventos(id),
    ADD COLUMN IF NOT EXISTS pesaje_fecha TIMESTAMPTZ;
