const { supabase, supabaseAdmin } = require('../config/supabase');
const QRCode = require('qrcode');
const votingService = require('../services/votingService');

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
            const total = (atletas || []).length;
            if (total > 15) faseTrabajo = 'eliminatoria';
            else if (total >= 7) faseTrabajo = 'semifinal';
            else faseTrabajo = 'final_r1';
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
    const { eventoCatId, resultados } = req.body;
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
        const faseActual = faseParam || (total > 15 ? 'eliminatoria' : total >= 7 ? 'semifinal' : 'final');
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
        const faseActual = fase || (total > 15 ? 'eliminatoria' : total >= 7 ? 'semifinal' : 'final');

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

// Enviar lista de clasificados al MC y Backstage
const enviarClasificadosMC = async (req, res) => {
    const { eventoCatId, categoriaNombre, fase, atletasIdsClasificados } = req.body;
    try {
        const { data: catRel } = await supabaseAdmin
            .from('eventos_categorias')
            .select('evento_id')
            .eq('id', eventoCatId)
            .single();

        // Obtener datos de los clasificados en orden de dorsal
        const { data: clasificados } = await supabaseAdmin
            .from('competidores')
            .select('numero_atleta, posicion_final, atletas(nombre)')
            .eq('evento_cat_id', eventoCatId)
            .in('atleta_id', atletasIdsClasificados || [])
            .order('numero_atleta', { ascending: true });

        const enOrdenDorsal = (clasificados || []).map(c => ({
            dorsal: c.numero_atleta,
            nombre: c.atletas?.nombre
        }));

        // Orden descendente de posición (para anuncio de premiación)
        const enOrdenPosicion = [...(clasificados || [])]
            .filter(c => c.posicion_final)
            .sort((a, b) => (b.posicion_final || 99) - (a.posicion_final || 99))
            .map(c => ({ dorsal: c.numero_atleta, nombre: c.atletas?.nombre, posicion: c.posicion_final }));

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

        // También actualizar backstage
        await supabaseAdmin
            .from('eventos')
            .update({ orden_backstage: { fase: (fase || '').toUpperCase(), atletas: enOrdenDorsal } })
            .eq('id', catRel.evento_id);

        res.json({ ok: true });
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

module.exports = {
    listarEstadisticas,
    verCalculosEvento,
    calcularPosiciones,
    verMesaComputo,
    oficializarCategoria,
    prepararPremiacion,
    verGestionAbsolutos,
    verMesaComputoAbsoluto,
    oficializarAbsoluto,
    imprimirBoletas,
    verPresidenteMesa,
    verComparacionJuez,
    guardarTop5,
    enviarClasificadosMC,
    imprimirCertificadosMasivos,
    verCertificadoPreview,
    verMesaComputoActual
};