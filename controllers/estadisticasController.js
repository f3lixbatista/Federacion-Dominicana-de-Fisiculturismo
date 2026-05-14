const supabase = require('../supabaseClient');
const votingService = require('../services/votingService');

const listarEstadisticas = async (req, res) => {
    try {  
        const { data: arrCategorias, error } = await supabase
            .from('eventos')
            .select('*')
            .order('salida', { ascending: true });

        if (error) throw error;
        
        res.render('estadisticas', { arrCategorias });
    } catch (error) {
        console.error("Error en estadísticas:", error.message);
        res.render('estadisticas', { arrCategorias: [] });
    }
};

const verCalculosEvento = async (req, res) => {
    const id = req.params.id;
    try {     
        const { data: datosEvento, error: errEvento } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', id)
            .single();

        if (errEvento) throw errEvento;

        const { data: competidores } = await supabase
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
        const { data: votos, error: votosError } = await supabase
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
        const { data: competidoresData, error: competidoresError } = await supabase
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
        const { data: categoriaRel, error: errCat } = await supabase
            .from('eventos_categorias')
            .select('*, categorias(nombre)')
            .eq('id', eventoCatId)
            .single();

        if (errCat) throw errCat;

        const { data: atletas } = await supabase
            .from('competidores')
            .select('atleta_id, numero_atleta, atletas(nombre)')
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

        const { data: jueces } = await supabase
            .from('panel_sillas_jueces')
            .select('numero_silla, profiles(nombre, id), paneles_jueces!inner(id_evento)')
            .eq('paneles_jueces.id_evento', categoriaRel.evento_id)
            .order('numero_silla', { ascending: true });

        const { data: votosEmitidos } = await supabase
            .from('votaciones_jueces')
            .select('*')
            .eq('evento_cat_id', eventoCatId)
            .eq('fase_competencia', faseTrabajo);

        res.render('estadisticas/mesa_computo', {
            categoria: categoriaRel,
            atletas: atletas || [],
            jueces: jueces || [],
            votos: votosEmitidos || [],
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
            supabase
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
        const { data: campeones, error } = await supabase
            .from('competidores')
            .select(`
                id,
                numero_atleta,
                atleta_id,
                atletas (nombre, preparador_id),
                eventos_categorias (
                    id,
                    categorias (nombre, modalidad, disciplina)
                )
            `)
            .eq('id_evento', idEvento)
            .eq('posicion_final', 1);

        if (error) throw error;

        const disciplinasParaAbsoluto = (campeones || []).reduce((acc, c) => {
            const disc = c.eventos_categorias?.categorias?.disciplina || 'Otras';
            if (!acc[disc]) acc[disc] = [];
            acc[disc].push(c);
            return acc;
        }, {});

        res.render('estadisticas/gestion_absolutos', { idEvento, absolutos: disciplinasParaAbsoluto });
    } catch (error) {
        res.status(500).send("Error detectando campeones: " + error.message);
    }
};

const verMesaComputoAbsoluto = async (req, res) => {
    const { evento, disciplina } = req.query;
    try {
        const { data: competidores } = await supabase
            .from('competidores')
            .select('*, atletas(nombre), eventos_categorias(id, categorias(nombre, disciplina))')
            .eq('id_evento', evento)
            .eq('posicion_final', 1);

        // Filtrar manualmente por la disciplina de la categoría
        const filtrados = (competidores || []).filter(c => c.eventos_categorias?.categorias?.disciplina === disciplina);

        const { data: jueces } = await supabase
            .from('panel_sillas_jueces')
            .select('numero_silla, profiles(nombre, id), paneles_jueces!inner(id_evento)')
            .eq('paneles_jueces.id_evento', evento)
            .order('numero_silla', { ascending: true });

        res.render('estadisticas/nueva_mesa_computo', {
            catRel: { categorias: { nombre: `ABSOLUTO: ${disciplina}` }, evento_id: evento, orden_secuencia_categoria: 'ABS' },
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
        await supabase
            .from('competidores')
            .update({ es_ganador_absoluto: true })
            .eq('atleta_id', atletaGanadorId)
            .eq('id_evento', idEvento);

        const updates = (resultados || []).map(resAtleta => 
            supabase.from('competidores').update({ puntos_totales: resAtleta.puntos }).eq('atleta_id', resAtleta.atleta_id).eq('id_evento', idEvento)
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
        const { data: categorias, error } = await supabase
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
    imprimirBoletas 
};