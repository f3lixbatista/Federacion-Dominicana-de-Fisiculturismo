const supabase = require('../supabaseClient');

const prepararEventoPage = async (req, res) => {
    const eventoId = req.params.id;

    try {
        const { data: evento, error: eventoError } = await supabase
            .from('eventos')
            .select('id, nombre, estado')
            .eq('id', eventoId)
            .single();

        if (eventoError || !evento) {
            throw eventoError || new Error('Evento no encontrado');
        }

        const { data: relaciones, error: errRel } = await supabase
            .from('eventos_categorias')
            .select(`
                id,
                orden_secuencia_categoria,
                estatus_logistica,
                categorias (
                    id,
                    nombre,
                    modalidad,
                    sexo,
                    disciplina,
                    division
                )
            `)
            .eq('evento_id', eventoId)
            .order('orden_secuencia_categoria', { ascending: true });

        if (errRel) {
            throw errRel;
        }

        const arrayCategorias = [];

        for (const rel of relaciones || []) {
            const { data: competidores, error: errComp } = await supabase
                .from('competidores')
                .select(`
                    id,
                    atletas (
                        nombre,
                        cedula,
                        gimnasio,
                        peso,
                        estatura
                    )
                `)
                .eq('evento_cat_id', rel.id)
                .eq('id_evento', eventoId)
                .eq('estatus_pesaje', 'aprobado');

            if (errComp) {
                throw errComp;
            }

            const atletasLimpios = (competidores || []).map(c => ({
                id: c.id,
                nombre: c.atletas?.nombre || 'Sin nombre',
                cedula: c.atletas?.cedula || 'Sin cédula',
                gimnasio: c.atletas?.gimnasio || 'Independiente',
                peso: c.atletas?.peso || '--',
                estatura: c.atletas?.estatura || '--'
            }));

            arrayCategorias.push({
                id: rel.id,
                orden_secuencia_categoria: rel.orden_secuencia_categoria,
                estatus_logistica: rel.estatus_logistica,
                categorias: rel.categorias,
                atletas: atletasLimpios,
                total_atletas: atletasLimpios.length
            });
        }

        res.render('eventos/preparacion', {
            eventoId,
            arrayCategorias,
            evento
        });
    } catch (error) {
        console.error('Error en preparación de evento:', error.message || error);
        res.status(500).send('Error cargando la preparación del evento.');
    }
};

const oficializarPreparacion = async (req, res) => {
    const { eventoId, logistica } = req.body;

    if (!eventoId || !Array.isArray(logistica) || logistica.length === 0) {
        return res.status(400).json({ estado: false, mensaje: 'Información logística incompleta.' });
    }

    try {
        // 1. Procesar fusiones y actualizaciones de estado en la tabla 'eventos_categorias'
        for (const item of logistica) {
            await supabase
                .from('eventos_categorias')
                .update({
                    orden_secuencia_categoria: item.orden,
                    estatus_logistica: item.estatus,
                    fusion_destino_id: item.fusion_destino_id || null
                })
                .eq('id', item.evento_cat_id);

            if (item.estatus === 'fusionada' && item.fusion_destino_id) {
                await supabase
                    .from('competidores')
                    .update({ evento_cat_id: item.fusion_destino_id })
                    .eq('evento_cat_id', item.evento_cat_id)
                    .eq('id_evento', eventoId);
            }
        }

        // 2. Dorsaleo correlativo automático
        const { data: categoriasOrdenadas, error: categoriasError } = await supabase
            .from('eventos_categorias')
            .select('id')
            .eq('evento_id', eventoId)
            .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
            .order('orden_secuencia_categoria', { ascending: true });

        if (categoriasError) {
            throw categoriasError;
        }

        let contadorDorsal = 1;
        for (const cat of categoriasOrdenadas || []) {
            const { data: competidores, error: competidoresError } = await supabase
                .from('competidores')
                .select('id')
                .eq('evento_cat_id', cat.id)
                .eq('id_evento', eventoId)
                .order('created_at', { ascending: true });

            if (competidoresError) {
                throw competidoresError;
            }

            if (competidores && competidores.length > 0) {
                for (const comp of competidores) {
                    await supabase
                        .from('competidores')
                        .update({ numero_atleta: contadorDorsal })
                        .eq('id', comp.id);
                    contadorDorsal++;
                }
            }
        }

        // 3. Cambiar el estado general del evento para habilitar fases en vivo
        await supabase
            .from('eventos')
            .update({ estado: 'en_progreso' })
            .eq('id', eventoId);

        res.json({ estado: true, mensaje: 'Listados reestructurados y dorsales asignados con éxito.' });
    } catch (error) {
        console.error('Error oficializando preparación:', error.message || error);
        res.status(500).json({ estado: false, mensaje: error.message || 'Error al oficializar.' });
    }
};

module.exports = {
    prepararEventoPage,
    oficializarPreparacion
};
