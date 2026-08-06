const { supabase, supabaseAdmin } = require('../config/supabase');
const QRCode = require('qrcode');
const votingService = require('../services/votingService');
const { tienePermiso } = require('../services/permisosService');

const listarEstadisticas = async (req, res) => {
    // Redirigimos a eventos ya que la gestión ahora es por evento individual
    // y se accede a través del Dashboard de cada competencia.
    res.redirect('/eventos/competencias');
};

const verCalculosEvento = async (req, res) => {
    const id = req.params.id;
    try {     
        const { data: datosEvento, error: errEvento } = await supabaseAdmin
            .from('eventos')
            .select('*')
            .eq('id', id)
            .single();

        if (errEvento) throw errEvento;

        const { data: competidores } = await supabaseAdmin
            .from('competidores')
            .select('*')
            .eq('id_evento', id);

        if (datosEvento) {
            datosEvento.Competidor = competidores || [];
        }

        res.render('calculos', { datos: datosEvento, error: false });       
    } catch (error) {       
        console.error(error);
        res.render('calculos', { error: true, mensaje: "No encontrado" });
    }
};

const calcularPosiciones = async (req, res) => {
    const { id, catId } = req.params;
    const { fase = 'final' } = req.body;

    try {
        const { data: votos, error: votosError } = await supabaseAdmin
            .from('votaciones_jueces')
            .select('atleta_id, posicion_asignada')
            .eq('id_evento', id)
            .eq('evento_cat_id', catId)
            .eq('fase_competencia', fase);

        if (votosError) throw votosError;

        const votosAgrupados = votos.reduce((acc, voto) => {
            if (!acc[voto.atleta_id]) acc[voto.atleta_id] = [];
            acc[voto.atleta_id].push(voto.posicion_asignada);
            return acc;
        }, {});

        const resultados = votingService.calcularPosicionesFinales(votosAgrupados);

        const atletasIds = resultados.map(r => r.atleta_id);
        
        // Obtener nombres de atletas y sus dorsales para esta categoría específica
        const { data: competidoresData, error: competidoresError } = await supabaseAdmin
            .from('competidores')
            .select(`
                atleta_id,
                numero_atleta,
                atletas ( nombre )
            `)
            .in('atleta_id', atletasIds)
            .eq('evento_cat_id', catId); // Filtrar por la categoría actual

        if (competidoresError) throw competidoresError;

        const atletasMap = (competidoresData || []).reduce((acc, comp) => {
            acc[comp.atleta_id] = {
                nombre: comp.atletas?.nombre || 'Desconocido',
                dorsal: comp.numero_atleta || 'N/A'
            };
            return acc;
        }, {});

        const resultadosParaPremiacion = resultados.map(r => ({
            atleta_id: r.atleta_id,
            atleta_nombre: atletasMap[r.atleta_id]?.nombre || 'Desconocido',
            dorsal: atletasMap[r.atleta_id]?.dorsal || 'N/A', // Añadimos el dorsal
            puntos: r.puntos,
            votos_originales: r.votosOriginales,
            posicion: r.lugarSugerido, // Mapeamos lugar_sugerido a posicion para la función de premiación
            empate: r.empateDetectado,
            lugar_sugerido: r.lugarSugerido // Mantenemos el original por si se necesita
        }));

        // Preparamos los resultados para la premiación (line-up y podio)
        const { lineup, podio } = prepararPremiacion(resultadosParaPremiacion);

        res.json({ estado: true, resultados: resultadosParaPremiacion, lineup, podio });
    } catch (error) {
        console.error('Error calculando posiciones oficiales:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const verMesaComputo = async (req, res) => {
    const { eventoCatId } = req.params;
    const { fase = 'auto' } = req.query; // eliminatoria, semifinal, final_r1, final_r2
    try {
        const { data: categoriaRel, error: errCat } = await supabaseAdmin
            .from('eventos_categorias')
            .select('*, categorias(nombre)')
            .eq('id', eventoCatId)
            .single();

        if (errCat) throw errCat;

        const { data: atletas } = await supabaseAdmin
            .from('competidores')
            .select('atleta_id, numero_atleta, puntos_totales, atletas(nombre)')
            .eq('evento_cat_id', eventoCatId)
            .order('numero_atleta', { ascending: true });

        // Lógica Automática de Fase (Si no se fuerza por URL)
        let faseTrabajo = fase;
        if (fase === 'auto') {
            faseTrabajo = votingService.resolverFaseAutomatica((atletas || []).length);
        }

        const { data: jueces } = await supabaseAdmin
            .from('panel_sillas_jueces')
            .select('numero_silla, profiles(nombre, id), paneles_jueces!inner(id_evento)')
            .eq('paneles_jueces.id_evento', categoriaRel.evento_id)
            .order('numero_silla', { ascending: true });

        const { data: votosEmitidos } = await supabaseAdmin
            .from('votaciones_jueces')
            .select('*')
            .eq('evento_cat_id', eventoCatId)
            .eq('fase_competencia', faseTrabajo);

        // Preparar mapa de votos para la vista unificada
        const mapaVotos = {};
        (atletas || []).forEach(a => mapaVotos[a.atleta_id] = {});
        (votosEmitidos || []).forEach(v => { if (mapaVotos[v.atleta_id]) mapaVotos[v.atleta_id][v.juez_id] = v.posicion_asignada; });

        res.render('estadisticas/computo', {
            eventoId: categoriaRel.evento_id,
            catRelId: eventoCatId,
            categoriaNombre: categoriaRel?.categorias?.nombre,
            jueces: (jueces || []).map(j => ({ id: j.profiles.id, nombre: j.profiles.nombre })),
            atletas: (atletas || []).map(a => ({ id: a.atleta_id, dorsal: a.numero_atleta, nombre: a.atletas?.nombre || '—', puntos_r1: a.puntos_totales || 0 })),
            mapaVotos,
            faseTrabajo
        });
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
};

const oficializarCategoria = async (req, res) => {
    const { eventoCatId, resultados, fase } = req.body;

    if (!['final_r1', 'final_r2'].includes(fase)) {
        return res.status(400).json({
            estado: false,
            mensaje: `No se puede oficializar en fase "${fase || 'desconocida'}". Solo se oficializan resultados en Final Ronda 1 o Ronda 2 — cambie el selector de fase a la ronda final correspondiente antes de oficializar.`
        });
    }

    try {
        const updates = resultados.map(resAtleta => 
            // El Juez Estadístico envía la posición final (sea la sugerida o la manual)
            supabaseAdmin
                .from('competidores')
                .update({ 
                    posicion_final: resAtleta.posicion, 
                    puntos_totales: resAtleta.puntos 
                })
                .eq('atleta_id', resAtleta.atleta_id)
                .eq('evento_cat_id', eventoCatId)
        );

        const finalResults = await Promise.all(updates);
        const errors = finalResults.filter(r => r.error);
        
        if (errors.length > 0) throw new Error("Algunos resultados no pudieron actualizarse.");

        res.json({ estado: true, mensaje: "Categoría oficializada. Resultados publicados." });
    } catch (error) {
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const FASES_ORDEN = ['eliminatoria', 'semifinal', 'final_r1', 'final_r2'];
const FASES_LABEL = {
    eliminatoria: 'Eliminatoria',
    semifinal: 'Semifinal',
    final_r1: 'Final — Ronda 1',
    final_r2: 'Final — Ronda 2'
};

/**
 * Vista de solo lectura (auditoría/protestas/calidad de jueces): todas las
 * categorías del evento como pestañas, y dentro de cada una un bloque de
 * tabla por cada etapa que realmente tenga votos registrados. Reusa
 * votingService.calcularPosicionesFinales — el mismo cálculo real que usa
 * la Mesa de Cómputo operativa — para no reimplementar el algoritmo IFBB
 * por tercera vez.
 */
const verMesaEstadisticas = async (req, res) => {
    const { idEvento } = req.params;
    try {
        const { data: evento, error: errEvento } = await supabaseAdmin
            .from('eventos')
            .select('id, nombre, cola_estadisticas_pendiente')
            .eq('id', idEvento)
            .single();
        if (errEvento) throw errEvento;

        const colaPendiente = evento.cola_estadisticas_pendiente || [];
        const evCatIdsEnCola = new Set(colaPendiente.map(c => c.evento_cat_id));
        const puedeGestionarCola = tienePermiso(res.locals.user?.role, 'computo', 'editar');

        const { data: eventosCategorias, error: errCats } = await supabaseAdmin
            .from('eventos_categorias')
            .select('id, orden_secuencia_categoria, categorias(nombre)')
            .eq('evento_id', idEvento)
            .order('orden_secuencia_categoria', { ascending: true });
        if (errCats) throw errCats;

        const { data: sillasJueces } = await supabaseAdmin
            .from('panel_sillas_jueces')
            .select('numero_silla, profiles(id, nombre), paneles_jueces!inner(id_evento)')
            .eq('paneles_jueces.id_evento', idEvento)
            .order('numero_silla', { ascending: true });
        const jueces = (sillasJueces || []).map(s => ({ id: s.profiles?.id, nombre: s.profiles?.nombre || '—' }));

        const evCatIds = (eventosCategorias || []).map(c => c.id);

        const { data: todosCompetidores } = evCatIds.length
            ? await supabaseAdmin
                .from('competidores')
                .select('evento_cat_id, atleta_id, numero_atleta, posicion_final, atletas(nombre)')
                .in('evento_cat_id', evCatIds)
            : { data: [] };

        const { data: todosVotos } = evCatIds.length
            ? await supabaseAdmin
                .from('votaciones_jueces')
                .select('evento_cat_id, juez_id, atleta_id, posicion_asignada, fase_competencia')
                .in('evento_cat_id', evCatIds)
            : { data: [] };

        const competidoresPorCat = {};
        (todosCompetidores || []).forEach(c => {
            (competidoresPorCat[c.evento_cat_id] = competidoresPorCat[c.evento_cat_id] || []).push(c);
        });
        const votosPorCat = {};
        (todosVotos || []).forEach(v => {
            (votosPorCat[v.evento_cat_id] = votosPorCat[v.evento_cat_id] || []).push(v);
        });

        const categorias = (eventosCategorias || []).map(ec => {
            const competidores = (competidoresPorCat[ec.id] || [])
                .sort((a, b) => (a.numero_atleta || 0) - (b.numero_atleta || 0));
            const votos = votosPorCat[ec.id] || [];
            const fasesPresentes = FASES_ORDEN.filter(f => votos.some(v => v.fase_competencia === f));

            let fases;
            if (fasesPresentes.length === 0 && competidores.length > 0) {
                // Aún no se ha votado nada en esta categoría — igual se muestra la
                // tabla de la fase que le corresponde (misma auto-detección que el
                // resto del sistema) con los atletas ya inscritos; lo único que
                // falta son los votos/total/lugar, que quedan en blanco.
                const faseEsperada = votingService.resolverFaseAutomatica(competidores.length);
                fases = [{
                    fase: faseEsperada,
                    faseLabel: FASES_LABEL[faseEsperada] || faseEsperada,
                    conVotos: false,
                    filas: competidores.map(c => ({
                        atleta_id: c.atleta_id,
                        atleta: c.atletas?.nombre || '—',
                        dorsal: c.numero_atleta,
                        votosJuez: jueces.map(() => ({ valor: undefined, descartado: false })),
                        total: null,
                        lugarSugerido: null,
                        empateDetectado: false
                    }))
                }];
            } else {
                fases = fasesPresentes.map(fase => {
                const votosFase = votos.filter(v => v.fase_competencia === fase);

                const votosPorAtleta = {};
                votosFase.forEach(v => {
                    (votosPorAtleta[v.atleta_id] = votosPorAtleta[v.atleta_id] || []).push(v.posicion_asignada);
                });
                const calculado = votingService.calcularPosicionesFinales(votosPorAtleta);
                const calculadoPorAtleta = {};
                calculado.forEach(r => { calculadoPorAtleta[r.atleta_id] = r; });

                const votosPorAtletaJuez = {};
                votosFase.forEach(v => {
                    (votosPorAtletaJuez[v.atleta_id] = votosPorAtletaJuez[v.atleta_id] || {})[v.juez_id] = v.posicion_asignada;
                });

                const filas = competidores
                    .filter(c => calculadoPorAtleta[c.atleta_id])
                    .map(c => {
                        const calc = calculadoPorAtleta[c.atleta_id];
                        // Para marcar en la matriz cuál(es) voto(s) concreto(s) fueron el
                        // extremo descartado, restamos el multiset limpio del original —
                        // lo que sobra (0, 1 o 2 valores) son los votos recortados.
                        const descartados = [...calc.votosOriginales];
                        calc.votosLimpios.forEach(v => {
                            const idx = descartados.indexOf(v);
                            if (idx !== -1) descartados.splice(idx, 1);
                        });

                        const votosJuez = jueces.map(j => {
                            const val = votosPorAtletaJuez[c.atleta_id]?.[j.id];
                            let esDescartado = false;
                            if (val !== undefined) {
                                const idxD = descartados.indexOf(val);
                                if (idxD !== -1) { esDescartado = true; descartados.splice(idxD, 1); }
                            }
                            return { valor: val, descartado: esDescartado };
                        });

                        return {
                            atleta_id: c.atleta_id,
                            atleta: c.atletas?.nombre || '—',
                            dorsal: c.numero_atleta,
                            votosJuez,
                            total: calc.puntos,
                            lugarSugerido: calc.lugarSugerido,
                            empateDetectado: calc.empateDetectado
                        };
                    })
                    .sort((a, b) => (a.lugarSugerido ?? 999) - (b.lugarSugerido ?? 999));

                    return { fase, faseLabel: FASES_LABEL[fase] || fase, conVotos: true, filas };
                });
            }

            return {
                id: ec.id,
                nombre: ec.categorias?.nombre || 'Sin nombre',
                fases,
                tieneAtletas: competidores.length > 0,
                enCola: evCatIdsEnCola.has(ec.id)
            };
        });

        res.render('estadisticas/mesa_estadisticas', {
            evento, categorias, jueces,
            puedeGestionarCola,
            colaPendienteCount: colaPendiente.length
        });
    } catch (error) {
        res.status(500).send('Error cargando Mesa de Estadísticas: ' + error.message);
    }
};

// Lógica para determinar el orden de premiación (Inversa para MC)
function prepararPremiacion(resultados) {
    // 1. Orden ascendente por dorsal para el "Line-up" inicial
    const lineup = [...resultados].sort((a, b) => (a.dorsal || 0) - (b.dorsal || 0));
    
    // 2. Orden descendente por posición (6°, 5°, 4°... hasta el 1°) para el micrófono
    const podio = [...resultados].sort((a, b) => (parseInt(b.posicion) || 999) - (parseInt(a.posicion) || 999));
    
    return { lineup, podio };
}

const verGestionAbsolutos = async (req, res) => {
    const { idEvento } = req.params;
    try {
        const { data: campeones, error } = await supabaseAdmin
            .from('competidores')
            .select(`
                id,
                numero_atleta,
                atleta_id,
                atletas (nombre, preparador_id),
                eventos_categorias (
                    id,
                    categorias (nombre, modalidad, disciplina, division)
                )
            `)
            .eq('id_evento', idEvento)
            .eq('posicion_final', 1);

        if (error) throw error;

        // Agrupar por disciplina + modalidad.
        // Solo puede haber absoluto si hay 2+ divisiones distintas con campeón
        // dentro de la misma disciplina y modalidad.
        const grupos = {};
        (campeones || []).forEach(c => {
            const cat = c.eventos_categorias?.categorias || {};
            const disc = cat.disciplina || 'Otras';
            const mod  = (cat.modalidad || 'Senior').toLowerCase();
            const key  = `${disc}|||${mod}`;
            if (!grupos[key]) grupos[key] = { disciplina: disc, modalidad: cat.modalidad || 'Senior', campeones: [] };
            grupos[key].campeones.push(c);
        });

        // Filtrar: solo grupos con 2+ campeones (= 2+ divisiones con ganador)
        const absolutos = Object.values(grupos).filter(g => g.campeones.length >= 2);

        res.render('estadisticas/gestion_absolutos', { idEvento, absolutos });
    } catch (error) {
        res.status(500).send("Error detectando campeones: " + error.message);
    }
};

const imprimirResultadosAbsolutos = async (req, res) => {
    const { idEvento } = req.params;
    try {
        const { data: evento } = await supabaseAdmin
            .from('eventos')
            .select('id, nombre, lugar, fecha_inicio')
            .eq('id', idEvento)
            .single();

        const { data: campeones, error } = await supabaseAdmin
            .from('competidores')
            .select(`
                id, numero_atleta, es_ganador_absoluto, puntos_totales,
                atletas (nombre),
                eventos_categorias ( categorias (nombre, modalidad, disciplina, division) )
            `)
            .eq('id_evento', idEvento)
            .eq('posicion_final', 1);

        if (error) throw error;

        const grupos = {};
        (campeones || []).forEach(c => {
            const cat = c.eventos_categorias?.categorias || {};
            const disc = cat.disciplina || 'Otras';
            const mod  = (cat.modalidad || 'Senior').toLowerCase();
            const key  = `${disc}|||${mod}`;
            if (!grupos[key]) grupos[key] = { disciplina: disc, modalidad: cat.modalidad || 'Senior', campeones: [] };
            grupos[key].campeones.push({
                dorsal: c.numero_atleta,
                nombre: c.atletas?.nombre || 'N/A',
                categoria: cat.nombre || 'N/A',
                division: cat.division || '--',
                esGanadorAbsoluto: !!c.es_ganador_absoluto,
                puntos: c.puntos_totales || null
            });
        });

        const absolutos = Object.values(grupos).filter(g => g.campeones.length >= 2);

        res.render('estadisticas/imprimir_absolutos', { evento, absolutos });
    } catch (error) {
        res.status(500).send("Error generando impresión de absolutos: " + error.message);
    }
};

const verMesaComputoAbsoluto = async (req, res) => {
    const { evento, disciplina, modalidad } = req.query;
    try {
        const { data: competidores } = await supabaseAdmin
            .from('competidores')
            .select('*, atletas(nombre), eventos_categorias(id, categorias(nombre, disciplina, modalidad))')
            .eq('id_evento', evento)
            .eq('posicion_final', 1);

        // Filtrar por disciplina y modalidad para no mezclar Senior con Junior o Master
        const filtrados = (competidores || []).filter(c => {
            const cat = c.eventos_categorias?.categorias || {};
            return cat.disciplina === disciplina &&
                   (cat.modalidad || '').toLowerCase() === (modalidad || '').toLowerCase();
        });

        const { data: jueces } = await supabaseAdmin
            .from('panel_sillas_jueces')
            .select('numero_silla, profiles(nombre, id), paneles_jueces!inner(id_evento)')
            .eq('paneles_jueces.id_evento', evento)
            .order('numero_silla', { ascending: true });

        const tituloAbsoluto = `ABSOLUTO: ${disciplina} (${modalidad || 'Senior'})`;

        res.render('estadisticas/nueva_mesa_computo', {
            catRel: { categorias: { nombre: tituloAbsoluto }, evento_id: evento, orden_secuencia_categoria: 'ABS' },
            competidores: filtrados,
            faseTrabajo: 'absoluto',
            votos: [],
            jueces: jueces || []
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const oficializarAbsoluto = async (req, res) => {
    const { atletaGanadorId, idEvento, resultados } = req.body;
    try {
        await supabaseAdmin
            .from('competidores')
            .update({ es_ganador_absoluto: true })
            .eq('atleta_id', atletaGanadorId)
            .eq('id_evento', idEvento);

        const updates = (resultados || []).map(resAtleta => 
            supabaseAdmin.from('competidores').update({ puntos_totales: resAtleta.puntos }).eq('atleta_id', resAtleta.atleta_id).eq('id_evento', idEvento)
        );
        await Promise.all(updates);

        res.json({ estado: true, mensaje: "Ganador Absoluto oficializado." });
    } catch (error) {
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const imprimirBoletas = async (req, res) => {
    const { idEvento } = req.params;
    try {
        const { data: categorias, error } = await supabaseAdmin
            .from('eventos_categorias')
            .select('id, categorias(nombre, modalidad), competidores(numero_atleta, atletas(nombre))')
            .eq('evento_id', idEvento)
            .neq('estatus_logistica', 'cerrada')
            .order('orden_secuencia_categoria', { ascending: true });

        if (error) throw error;
        res.render('estadisticas/print_boletas', { categorias });
    } catch (e) {
        res.redirect('/eventos');
    }
};

const verPresidenteMesa = async (req, res) => {
    const { eventoCatId } = req.params;
    const { fase: faseParam } = req.query;
    try {
        const { data: catRel } = await supabaseAdmin
            .from('eventos_categorias')
            .select('*, categorias(nombre), eventos(id, nombre)')
            .eq('id', eventoCatId)
            .single();

        if (!catRel) throw new Error('Categoría no encontrada');

        const { data: competidores } = await supabaseAdmin
            .from('competidores')
            .select('atleta_id, numero_atleta, foto_atletica_url, atletas(nombre, provincia)')
            .eq('evento_cat_id', eventoCatId)
            .order('numero_atleta', { ascending: true });

        const total = (competidores || []).length;
        const faseActual = faseParam || votingService.resolverFaseAutomatica(total);
        const requiereTop5 = total > 7;
        const limiteClasificacion = faseActual === 'eliminatoria' ? 15 : 6;

        const { data: preSeleccion } = await supabaseAdmin
            .from('pre_seleccion_top5')
            .select('atleta_id, juez_id, profiles(nombre)')
            .eq('evento_cat_id', eventoCatId)
            .eq('fase', faseActual);

        // Conteo de votos por atleta
        const consenso = {};
        (preSeleccion || []).forEach(v => {
            if (!consenso[v.atleta_id]) consenso[v.atleta_id] = { count: 0, jueces: [] };
            consenso[v.atleta_id].count++;
            consenso[v.atleta_id].jueces.push(v.profiles?.nombre || 'Juez');
        });

        const { data: jueces } = await supabaseAdmin
            .from('panel_sillas_jueces')
            .select('numero_silla, profiles(id, nombre), paneles_jueces!inner(id_evento)')
            .eq('paneles_jueces.id_evento', catRel.evento_id)
            .order('numero_silla', { ascending: true });

        res.render('estadisticas/presidente_mesa', {
            catId: eventoCatId,
            eventoId: catRel.evento_id,
            categoriaNombre: catRel.categorias?.nombre,
            eventoNombre: catRel.eventos?.nombre,
            competidores: (competidores || []).map(c => ({
                atleta_id: c.atleta_id,
                dorsal: c.numero_atleta,
                nombre: c.atletas?.nombre,
                provincia: c.atletas?.provincia,
                foto_url: c.foto_atletica_url
            })),
            faseActual,
            requiereTop5,
            limiteClasificacion,
            totalJueces: (jueces || []).length,
            jueces: (jueces || []).map(j => ({ id: j.profiles?.id, nombre: j.profiles?.nombre })),
            consenso
        });
    } catch (error) {
        console.error("Error en panel presidente mesa:", error.message);
        res.redirect('/eventos/competencias');
    }
};

// Vista para que los jueces marquen su Top 5 en comparación
const verComparacionJuez = async (req, res) => {
    const { eventoCatId } = req.params;
    const { fase } = req.query;
    const juezId = res.locals.user?.id;
    try {
        const { data: catRel } = await supabaseAdmin
            .from('eventos_categorias')
            .select('evento_id, categorias(nombre)')
            .eq('id', eventoCatId)
            .single();

        const { data: competidores } = await supabaseAdmin
            .from('competidores')
            .select('atleta_id, numero_atleta, foto_atletica_url, atletas(nombre)')
            .eq('evento_cat_id', eventoCatId)
            .order('numero_atleta', { ascending: true });

        const total = (competidores || []).length;
        const faseActual = fase || votingService.resolverFaseAutomatica(total);

        // Selección previa de este juez
        const { data: miSeleccion } = await supabaseAdmin
            .from('pre_seleccion_top5')
            .select('atleta_id')
            .eq('evento_cat_id', eventoCatId)
            .eq('juez_id', juezId)
            .eq('fase', faseActual);

        const misSeleccionados = (miSeleccion || []).map(v => v.atleta_id);

        res.render('estadisticas/comparacion_juez', {
            catId: eventoCatId,
            categoriaNombre: catRel?.categorias?.nombre,
            faseActual,
            competidores: (competidores || []).map(c => ({
                atleta_id: c.atleta_id,
                dorsal: c.numero_atleta,
                nombre: c.atletas?.nombre,
                foto_url: c.foto_atletica_url,
                seleccionado: misSeleccionados.includes(c.atleta_id)
            }))
        });
    } catch (e) {
        res.status(500).send('Error: ' + e.message);
    }
};

// Guardar la selección Top 5 de un juez
const guardarTop5 = async (req, res) => {
    const { eventoCatId, atletaIds, fase } = req.body;
    const juezId = res.locals.user?.id;
    if (!juezId) return res.status(401).json({ ok: false, mensaje: 'No autenticado' });
    if (!Array.isArray(atletaIds) || atletaIds.length > 5)
        return res.status(400).json({ ok: false, mensaje: 'Máximo 5 atletas permitidos' });

    try {
        await supabaseAdmin
            .from('pre_seleccion_top5')
            .delete()
            .eq('evento_cat_id', eventoCatId)
            .eq('juez_id', juezId)
            .eq('fase', fase || 'semifinal');

        if (atletaIds.length > 0) {
            const { error } = await supabaseAdmin.from('pre_seleccion_top5').insert(
                atletaIds.map(atleta_id => ({
                    evento_cat_id: eventoCatId,
                    juez_id: juezId,
                    atleta_id,
                    fase: fase || 'semifinal'
                }))
            );
            if (error) throw error;
        }
        res.json({ ok: true, guardados: atletaIds.length });
    } catch (e) {
        res.status(500).json({ ok: false, mensaje: e.message });
    }
};

// Resuelve, para una categoría + lista de atletas clasificados, el listado en
// orden de dorsal (llamada a escena) y en orden de posición descendente (para
// anuncio de podio) — prioriza posiciones ya calculadas por el llamador (ej.
// Mesa de Estadísticas, que las computa desde los votos aunque la categoría
// aún no se haya oficializado en competidores.posicion_final).
const _resolverListasClasificados = async (eventoCatId, atletasIdsClasificados, resultados) => {
    const { data: clasificados } = await supabaseAdmin
        .from('competidores')
        .select('atleta_id, numero_atleta, posicion_final, atletas(nombre)')
        .eq('evento_cat_id', eventoCatId)
        .in('atleta_id', atletasIdsClasificados || [])
        .order('numero_atleta', { ascending: true });

    const posicionesManual = {};
    (resultados || []).forEach(r => { posicionesManual[r.atleta_id] = r.posicion; });

    const enOrdenDorsal = (clasificados || []).map(c => ({
        dorsal: c.numero_atleta,
        nombre: c.atletas?.nombre
    }));

    const enOrdenPosicion = [...(clasificados || [])]
        .map(c => ({ ...c, _pos: posicionesManual[c.atleta_id] ?? c.posicion_final }))
        .filter(c => c._pos)
        .sort((a, b) => (b._pos || 99) - (a._pos || 99))
        .map(c => ({ dorsal: c.numero_atleta, nombre: c.atletas?.nombre, posicion: c._pos }));

    return { enOrdenDorsal, enOrdenPosicion };
};

// Enviar lista de clasificados/resultados al MC (y a Backstage, salvo en fases finales)
const enviarClasificadosMC = async (req, res) => {
    const { eventoCatId, categoriaNombre, fase, atletasIdsClasificados, resultados } = req.body;
    try {
        const { data: catRel } = await supabaseAdmin
            .from('eventos_categorias')
            .select('evento_id')
            .eq('id', eventoCatId)
            .single();

        const { enOrdenDorsal, enOrdenPosicion } = await _resolverListasClasificados(eventoCatId, atletasIdsClasificados, resultados);

        await supabaseAdmin
            .from('eventos')
            .update({
                resultados_en_vivo: {
                    tipo_alerta: 'clasificados',
                    categoria_nombre: categoriaNombre,
                    fase_competencia: fase,
                    atletas: enOrdenDorsal,
                    atletas_posicion: enOrdenPosicion,
                    timestamp: Date.now()
                }
            })
            .eq('id', catRel.evento_id);

        // Backstage solo necesita saber quién sigue en juego para llamarlo a
        // escena en la SIGUIENTE ronda — en una final ya no hay próxima ronda
        // que anunciar por Backstage, solo el MC anuncia el podio.
        if (!['final_r1', 'final_r2'].includes(fase)) {
            await supabaseAdmin
                .from('eventos')
                .update({ orden_backstage: { fase: (fase || '').toUpperCase(), atletas: enOrdenDorsal } })
                .eq('id', catRel.evento_id);
        }

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, mensaje: e.message });
    }
};

// Agrega el resultado final de UNA categoría a la cola pendiente del evento
// (eventos.cola_estadisticas_pendiente) — todavía invisible para el MC, solo
// queda "staged" hasta que se presione "Enviar cola de resultados". Reemplaza
// cualquier entrada previa de la misma categoría (idempotente si se agrega 2 veces).
const agregarColaResultados = async (req, res) => {
    const { eventoId, eventoCatId, categoriaNombre, fase, atletasIdsClasificados, resultados } = req.body;
    try {
        const { enOrdenDorsal, enOrdenPosicion } = await _resolverListasClasificados(eventoCatId, atletasIdsClasificados, resultados);

        const { data: eventoRow, error: errEvento } = await supabaseAdmin
            .from('eventos')
            .select('cola_estadisticas_pendiente')
            .eq('id', eventoId)
            .single();
        if (errEvento) throw errEvento;

        const colaActual = (eventoRow.cola_estadisticas_pendiente || []).filter(c => c.evento_cat_id !== eventoCatId);
        colaActual.push({
            evento_cat_id: eventoCatId,
            categoria_nombre: categoriaNombre,
            fase_competencia: fase,
            atletas: enOrdenDorsal,
            atletas_posicion: enOrdenPosicion,
            timestamp: Date.now()
        });

        const { error: errUpdate } = await supabaseAdmin
            .from('eventos')
            .update({ cola_estadisticas_pendiente: colaActual })
            .eq('id', eventoId);
        if (errUpdate) throw errUpdate;

        res.json({ ok: true, pendientes: colaActual.length });
    } catch (e) {
        res.status(500).json({ ok: false, mensaje: e.message });
    }
};

// Vacía la cola pendiente del evento hacia eventos.resultados_en_vivo (el canal
// que Monitor MC sí consume en tiempo real), para que el MC los vaya anunciando
// uno por uno con el botón "Siguiente resultado". No toca Backstage — estos son
// siempre resultados de fase final.
const enviarColaResultados = async (req, res) => {
    const { eventoId } = req.body;
    try {
        const { data: eventoRow, error: errEvento } = await supabaseAdmin
            .from('eventos')
            .select('cola_estadisticas_pendiente')
            .eq('id', eventoId)
            .single();
        if (errEvento) throw errEvento;

        const cola = eventoRow.cola_estadisticas_pendiente || [];
        if (!cola.length) return res.status(400).json({ ok: false, mensaje: 'No hay resultados pendientes en la cola.' });

        const { error: errUpdate } = await supabaseAdmin
            .from('eventos')
            .update({
                resultados_en_vivo: { tipo_alerta: 'cola_resultados', cola, indice: 0, timestamp: Date.now() },
                cola_estadisticas_pendiente: []
            })
            .eq('id', eventoId);
        if (errUpdate) throw errUpdate;

        res.json({ ok: true, enviados: cola.length });
    } catch (e) {
        res.status(500).json({ ok: false, mensaje: e.message });
    }
};

const imprimirCertificadosMasivos = async (req, res) => {
    const { eventoId } = req.params;
    try {
        const { data: resultados, error } = await supabaseAdmin
            .from('competidores')
            .select(`
                *,
                atletas(nombre),
                eventos_categorias(categorias(nombre)),
                eventos(nombre)
            `)
            .eq('id_evento', eventoId)
            .order('posicion_final', { ascending: true });

        if (error) throw error;

        // Generamos los QR para cada certificado individualmente en el servidor
        const resultadosConQR = await Promise.all((resultados || []).map(async (r) => {
            const validUrl = `${req.protocol}://${req.get('host')}/eventos/validar-logro/${r.id}`;
            const qrCode = await QRCode.toDataURL(validUrl, { margin: 1, color: { dark: '#002d72' } });
            return { ...r, qrCode };
        }));

        res.render('reportes/impresion_masiva', { resultados: resultadosConQR });
    } catch (error) {
        console.error("Error en impresión masiva:", error.message);
        res.redirect('/eventos');
    }
};

const verCertificadoPreview = async (req, res) => {
    const { idCompetidor } = req.params;
    try {
        const { data: comp, error } = await supabaseAdmin
            .from('competidores')
            .select(`
                id,
                posicion_final,
                eventos ( id, nombre, lugar, fecha_inicio, estado ),
                eventos_categorias ( categorias ( nombre ) ),
                atletas ( id, nombre, cedula )
            `)
            .eq('id', idCompetidor)
            .single();

        if (error || !comp) return res.status(404).send('Registro no encontrado.');

        // Disponible desde que el evento está en curso (para entrega en tarima) o finalizado
        const estadosPermitidos = ['en_progreso', 'finalizado'];
        if (!estadosPermitidos.includes(comp.eventos?.estado)) {
            return res.send("El certificado estará disponible una vez el evento haya iniciado.");
        }

        // Generar QR de validación dinámico
        const validUrl = `${req.protocol}://${req.get('host')}/eventos/validar-logro/${comp.id}`;
        const qrValidacion = await QRCode.toDataURL(validUrl, { margin: 1, color: { dark: '#002d72' } });

        res.render('reportes/certificado', {
            atleta: comp.atletas,
            evento: comp.eventos,
            posicion: comp.posicion_final ? `${comp.posicion_final}° Lugar` : 'Participante',
            categoria: comp.eventos_categorias?.categorias?.nombre || 'N/A',
            qrValidacion
        });
    } catch (error) {
        console.error('🔥 Error al previsualizar certificado:', error.message);
        res.status(500).send(error.message);
    }
};

/**
 * Busca la categoría actualmente activa en el evento y redirige a la mesa de cómputo.
 * Esto permite al estadístico tener una "pantalla única" desde el Centro de Mando.
 */
const verMesaComputoActual = async (req, res) => {
    const { id: eventoId } = req.params;
    try {
        const { data: catActiva, error } = await supabaseAdmin
            .from('eventos_categorias')
            .select('id')
            .eq('evento_id', eventoId)
            .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
            .order('orden_secuencia_categoria', { ascending: true })
            .limit(1)
            .single();

        if (error || !catActiva) {
            return res.status(404).send("No hay ninguna categoría activa en tarima actualmente. Por favor, abra una categoría en el panel de Preparación.");
        }

        res.redirect(`/eventos/${eventoId}/computo/${catActiva.id}`);
    } catch (error) {
        console.error("Error al localizar mesa actual:", error.message);
        res.redirect(`/eventos/${eventoId}/centro-mando`);
    }
};

const verPresidenteMesaActual = async (req, res) => {
    const { id: eventoId } = req.params;
    try {
        const { data: catActiva, error } = await supabaseAdmin
            .from('eventos_categorias')
            .select('id')
            .eq('evento_id', eventoId)
            .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
            .order('orden_secuencia_categoria', { ascending: true })
            .limit(1)
            .single();

        if (error || !catActiva) {
            return res.status(404).send("No hay ninguna categoría activa en tarima actualmente. Por favor, abra una categoría en el panel de Preparación.");
        }

        res.redirect(`/estadisticas/presidente-mesa/${catActiva.id}`);
    } catch (error) {
        console.error("Error al localizar presidente de mesa:", error.message);
        res.redirect(`/eventos/${eventoId}/centro-mando`);
    }
};

module.exports = {
    listarEstadisticas,
    verCalculosEvento,
    calcularPosiciones,
    verMesaComputo,
    verMesaEstadisticas,
    oficializarCategoria,
    prepararPremiacion,
    verGestionAbsolutos,
    imprimirResultadosAbsolutos,
    verMesaComputoAbsoluto,
    oficializarAbsoluto,
    imprimirBoletas,
    verPresidenteMesa,
    verComparacionJuez,
    guardarTop5,
    enviarClasificadosMC,
    agregarColaResultados,
    enviarColaResultados,
    imprimirCertificadosMasivos,
    verCertificadoPreview,
    verMesaComputoActual,
    verPresidenteMesaActual
};