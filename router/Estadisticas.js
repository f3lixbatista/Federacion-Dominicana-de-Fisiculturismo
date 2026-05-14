const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { checkRole } = require('../middlewares/auth');

// 1. VISTA PRINCIPAL DE ESTADÍSTICAS (LISTAR CATEGORÍAS/EVENTOS)
router.get('/', async (req, res) => {
    try {  
        // Consultamos la tabla eventos ordenada por la columna 'salida'
        const { data: arrCategorias, error } = await supabase
            .from('eventos')
            .select('*')
            .order('salida', { ascending: true });

        if (error) throw error;
        
        res.render('estadisticas', {
            arrCategorias: arrCategorias
        });
    
    } catch (error) {
        console.error("Error en estadísticas:", error.message);
        res.render('estadisticas', { arrCategorias: [] });
    }
});

// 2. VISTA DE CÁLCULOS PARA UN EVENTO ESPECÍFICO
router.get('/:id', async (req, res) => {
    const id = req.params.id;
     
    try {     
        // Obtenemos los datos del evento/categoría
        const { data: datosEvento, error: errEvento } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', id)
            .single();

        // OPCIONAL: Si necesitas los competidores de este evento para los cálculos
        const { data: competidores, error: errComp } = await supabase
            .from('competidores')
            .select('*')
            .eq('id_evento', id);

        if (errEvento) throw errEvento;
        
        // Combinamos los datos si tu vista 'calculos' espera ver a los competidores dentro
        if (datosEvento) {
            datosEvento.Competidor = competidores || [];
        }

        res.render('calculos', {
            datos: datosEvento,
            error: false           
        });       
        
    } catch (error) {       
        console.error(error);
        res.render('calculos', { 
            error: true,
            mensaje: "No encontrado"
        });
    }
});

// 3. CÁLCULO FINAL DE POSICIONES OFICIALES (Regla IFBB - Extremas eliminadas)
router.post('/:id/calcular/:catId', checkRole(['estadistico', 'admin']), async (req, res) => {
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

        const resultados = calcularPosicionesFinales(votosAgrupados);

        const atletasIds = resultados.map(r => r.atleta_id);
        const { data: atletas, error: atletasError } = await supabase
            .from('atletas')
            .select('id, nombre')
            .in('id', atletasIds);

        if (atletasError) throw atletasError;

        const atletasMap = atletas.reduce((acc, atleta) => {
            acc[atleta.id] = atleta.nombre;
            return acc;
        }, {});

        const resultadosConNombres = resultados.map(r => ({
            atleta_id: r.atleta_id,
            atleta_nombre: atletasMap[r.atleta_id] || 'Desconocido',
            puntos: r.puntos,
            votos_originales: r.votosOriginales,
            lugar: r.lugar
        }));

        res.json({ estado: true, resultados: resultadosConNombres });
    } catch (error) {
        console.error('Error calculando posiciones oficiales:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
});

function calcularPosicionesFinales(votosPorAtleta) {
    const resultados = Object.entries(votosPorAtleta).map(([atleta_id, votos]) => {
        const votosOrdenados = [...votos].sort((a, b) => a - b);
        let votosLimpios = [...votosOrdenados];

        if (votosLimpios.length >= 5) {
            votosLimpios.shift();
            votosLimpios.pop();
        }

        const puntos = votosLimpios.reduce((sum, valor) => sum + valor, 0);
        return {
            atleta_id,
            votosOriginales: votos,
            votosLimpios,
            puntos
        };
    });

    resultados.sort((a, b) => {
        if (a.puntos !== b.puntos) return a.puntos - b.puntos;
        const primerosA = a.votosOriginales.filter(v => v === 1).length;
        const primerosB = b.votosOriginales.filter(v => v === 1).length;
        return primerosB - primerosA;
    });

    return resultados.map((resultado, index) => ({
        ...resultado,
        lugar: index + 1
    }));
}

// 4. MESA DE CÓMPUTO PARA UNA CATEGORÍA ESPECÍFICA
router.get('/computo/:eventoCatId', checkRole(['admin', 'estadistico']), async (req, res) => {
    const { eventoCatId } = req.params;

    try {
        // 1. Obtener datos de la categoría y el evento
        const { data: categoriaRel, error: errCat } = await supabase
            .from('eventos_categorias')
            .select('*, categorias(nombre)')
            .eq('id', eventoCatId)
            .single();

        if (errCat) throw errCat;

        // 2. Traer atletas con sus dorsales
        const { data: atletas, error: errAtletas } = await supabase
            .from('competidores')
            .select('atleta_id, numero_atleta, atletas(nombre)')
            .eq('evento_cat_id', eventoCatId)
            .order('numero_atleta', { ascending: true });

        if (errAtletas) throw errAtletas;

        // 3. Traer los jueces asignados al panel actual
        const { data: jueces, error: errJueces } = await supabase
            .from('panel_sillas_jueces')
            .select('numero_silla, profiles(nombre, id)')
            .order('numero_silla', { ascending: true });

        if (errJueces) throw errJueces;

        // 4. Traer votos ya emitidos para esta categoría
        const { data: votosEmitidos, error: errVotos } = await supabase
            .from('votaciones_jueces')
            .select('*')
            .eq('evento_cat_id', eventoCatId);

        if (errVotos) throw errVotos;

        res.render('estadisticas/mesa_computo', {
            categoria: categoriaRel,
            atletas: atletas || [],
            jueces: jueces || [],
            votos: votosEmitidos || []
        });
    } catch (error) {
        console.error('Error cargando mesa de cómputo:', error.message);
        res.status(500).send('Error: ' + error.message);
    }
});

// 5. OFICIALIZAR CATEGORÍA Y GUARDAR RESULTADOS FINALES
router.post('/oficializar-categoria', checkRole(['admin', 'estadistico']), async (req, res) => {
    const { eventoCatId, resultados } = req.body;
    // 'resultados' es un array: [{atleta_id, posicion, puntos}, ...]

    try {
        for (const resAtleta of resultados) {
            // 1. Actualizamos la tabla competidores con el lugar y puntos
            const { error } = await supabase
                .from('competidores')
                .update({
                    posicion_final: resAtleta.posicion,
                    puntos_totales: resAtleta.puntos
                })
                .eq('atleta_id', resAtleta.atleta_id)
                .eq('evento_cat_id', eventoCatId);

            if (error) throw error;
        }

        res.json({ estado: true, mensaje: "Categoría oficializada. Resultados publicados." });

    } catch (error) {
        console.error('Error oficializando categoría:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
});

module.exports = router;
