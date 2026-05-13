const supabase = require('../supabaseClient');

const inscripcionPage = async (req, res) => {
    try {
        const { data: evento, error: errEv } = await supabase
            .from('eventos')
            .select('*')
            .or('estado.eq.inscripcion,estado.eq.pesaje')
            .limit(1)
            .single();

        const { data: arrayAtletas } = await supabase
            .from('atletas')
            .select('*')
            .eq('estatus_afiliacion', 'habilitado');

        let arrayCategorias = [];
        if (evento) {
            const { data: cats, error } = await supabase
                .from('eventos_categorias')
                .select(`
                    id,
                    categorias!inner (id, nombre, modalidad, sexo, division)
                `)
                .eq('evento_id', evento.id);
            arrayCategorias = cats || [];
            if (error) throw error;
        }

        res.render('inscripcion', {
            eventoActual: evento || { nombre: 'Sin evento activo', estado: 'cerrado', id: null },
            arrayAtletas: arrayAtletas || [],
            arrayCategorias
        });
    } catch (error) {
        console.error('Error al cargar inscripción:', error.message);
        res.render('inscripcion', {
            eventoActual: { nombre: 'Error', estado: 'cerrado' },
            arrayAtletas: [],
            arrayCategorias: []
        });
    }
};

const asignarNumeros = async (req, res) => {
    const { IdCompetidor, Numero } = req.body;
    try {
        const promesas = [];
        const ids = Array.isArray(IdCompetidor) ? IdCompetidor : [IdCompetidor];
        const numeros = Array.isArray(Numero) ? Numero : [Numero];

        for (let i = 0; i < ids.length; i++) {
            if (ids[i]) {
                promesas.push(
                    supabase
                        .from('competidores')
                        .update({ numero_competidor: numeros[i] })
                        .eq('id', ids[i])
                );
            }
        }

        await Promise.all(promesas);
        res.redirect('/inscripcion');
    } catch (error) {
        console.error('Error al asignar números:', error.message);
        res.status(500).send('Error actualizando números');
    }
};

const inscripcionAtletaPage = async (req, res) => {
    try {
        const { data: eventosConCategorias, error } = await supabase
            .from('eventos')
            .select(`
                id,
                nombre,
                lugar,
                fecha_inicio,
                eventos_categorias (
                    id,
                    categoria_id,
                    categorias (nombre, modalidad, disciplina, division)
                )
            `)
            .eq('estado', 'inscripcion');

        if (error) throw error;

        res.render('inscripcionAtleta', { eventos: eventosConCategorias || [] });
    } catch (error) {
        console.error('Error en InscripcionAtleta:', error.message);
        res.render('inscripcionAtleta', { eventos: [] });
    }
};

const crearCompetidor = async (req, res) => {
    try {
        const body = req.body;
        const { error } = await supabase.from('competidores').insert([{
            id_evento: body.id_evento,
            idfdff: body.idfdff,
            nombre: body.nombre,
            cedula: body.cedula,
            peso_real: body.peso_real,
            estatura_real: body.estatura_real,
            preparador: body.preparador,
            numero_competidor: 0
        }]);

        if (error) throw error;
        res.json({ estado: true, mensaje: 'Inscrito con éxito' });
    } catch (error) {
        console.error('Error creando competidor:', error.message);
        res.json({ estado: false, mensaje: 'Error al inscribir' });
    }
};

const pesajePage = async (req, res) => {
    try {
        const { data: atletas } = await supabase.from('atletas').select('*');
        res.render('pesaje', {
            atletas: atletas || [],
            juezLogueado: res.locals.user
        });
    } catch (error) {
        console.error('Error en pesaje:', error.message);
        res.render('pesaje', { atletas: [], error: error.message });
    }
};

const detalleInscripcion = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: arrayCategorias } = await supabase
            .from('eventos')
            .select('*')
            .order('nombre', { ascending: true });

        const { data: atleta, error } = await supabase
            .from('atletas')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !atleta) throw error || new Error('Atleta no encontrado');

        res.render('detalleInscripcion', {
            atleta,
            arrayCategorias: arrayCategorias || [],
            error: false
        });
    } catch (error) {
        console.error('Error en detalleInscripcion:', error.message);
        res.render('detalleInscripcion', { error: true, mensaje: 'Atleta no encontrado' });
    }
};

const guardarInscripcionAsistida = async (req, res) => {
    const { atleta_id, id_evento, categoriasElegidas } = req.body;
    const juez_id = res.locals.user?.id;

    if (!atleta_id || !id_evento || !categoriasElegidas || categoriasElegidas.length === 0) {
        return res.status(400).json({ estado: false, mensaje: 'Datos incompletos para la inscripción.' });
    }

    try {
        const categoriasArray = Array.isArray(categoriasElegidas) ? categoriasElegidas : [categoriasElegidas];

        const registrosCompetidores = categoriasArray.map(eventoCatId => ({
            atleta_id,
            evento_cat_id: eventoCatId,
            id_evento,
            juez_id,
            estatus_pesaje: 'aprobado',
            salida: 0
        }));

        const { error: errComp } = await supabase
            .from('competidores')
            .insert(registrosCompetidores);

        if (errComp) throw errComp;

        res.json({ estado: true, mensaje: '¡Inscripción oficializada y categorías registradas con éxito!' });
    } catch (error) {
        console.error('🔥 Error en Inscripción Asistida:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

module.exports = {
    inscripcionPage,
    asignarNumeros,
    inscripcionAtletaPage,
    crearCompetidor,
    pesajePage,
    detalleInscripcion,
    guardarInscripcionAsistida
};
