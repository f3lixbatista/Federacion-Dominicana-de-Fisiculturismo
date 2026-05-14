const supabase = require('../supabaseClient');

const getListadoPublico = async (eventoId) => {
    const { data: categoriasPublicas, error: catError } = await supabase
        .from('eventos_categorias')
        .select('id, orden_secuencia_categoria, categorias(nombre)')
        .eq('evento_id', eventoId)
        .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
        .order('orden_secuencia_categoria', { ascending: true });

    if (catError) throw catError;

    const listadoCompleto = [];
    for (const cat of categoriasPublicas) {
        const { data: competidores } = await supabase
            .from('competidores')
            .select('numero_atleta, numero_competidor, nombre, gimnasio, preparador')
            .eq('evento_cat_id', cat.id)
            .eq('id_evento', eventoId)
            .order('numero_atleta', { ascending: true });

        listadoCompleto.push({
            id: cat.id,
            orden: cat.orden_secuencia_categoria,
            nombre: cat.categorias?.nombre || 'Categoría',
            total: (competidores || []).length,
            atletas: (competidores || []).map(atleta => ({
                dorsal: atleta.numero_atleta || atleta.numero_competidor || 0,
                nombre: atleta.nombre,
                team: atleta.gimnasio || atleta.preparador || '--'
            }))
        });
    }
    return listadoCompleto;
};

module.exports = {
    getListadoPublico
};