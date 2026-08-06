-- Cola de resultados finales pendientes de enviar al Maestro de Ceremonias.
-- El estadistico "agrega a la cola" el resultado final de una categoria desde
-- Mesa de Estadisticas (queda guardado aqui, invisible para el MC) y cuando
-- corresponda premiacion en el programa del evento presiona "ENVIAR COLA DE
-- RESULTADOS", que mueve todo lo acumulado aqui hacia eventos.resultados_en_vivo
-- (el canal que si consume Monitor MC en tiempo real) y vacia esta columna.
ALTER TABLE eventos
    ADD COLUMN IF NOT EXISTS cola_estadisticas_pendiente JSONB DEFAULT '[]'::jsonb;
