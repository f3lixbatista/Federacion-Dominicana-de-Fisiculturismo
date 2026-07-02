const { supabase, supabaseAdmin } = require('../config/supabase');

const inscripcionPage = async (req, res) => {
    try {
        let evento;
        if (req.query.evento) {
            const { data } = await supabaseAdmin
                .from('eventos').select('*').eq('id', req.query.evento).single();
            evento = data;
        } else {
            const { data } = await supabaseAdmin
                .from('eventos').select('*')
                .or('estado.eq.inscripcion,estado.eq.pesaje,estado.eq.en_progreso')
                .order('created_at', { ascending: false })
                .limit(1).single();
            evento = data;
        }

        const { data: arrayAtletas } = await supabaseAdmin
            .from('atletas')
            .select('*')
            .eq('estatus_afiliacion', 'habilitado');

        const { data: arrayPreparadores } = await supabaseAdmin
            .from('preparadores')
            .select('id, nombre_completo, gimnasio_labora')
            .order('nombre_completo', { ascending: true });

        let arrayCategorias = [];
        if (evento) {
            const { data: cats, error } = await supabaseAdmin
                .from('eventos_categorias')
                .select(`
                    id,
                    categorias!inner (id, nombre, modalidad, disciplina, sexo, division, edad_min, edad_max)
                `)
                .eq('evento_id', evento.id);
            arrayCategorias = cats || [];
            console.log('[inscripcionPage] eventoActual.id:', evento?.id, '| arrayCategorias.length:', arrayCategorias.length, '| error:', error?.message);
            if (error) throw error;
        }

        // Calcular precios efectivos (Early Bird si aplica)
        const ahora = new Date();
        const esPrecioOferta = evento?.fecha_limite_oferta && ahora <= new Date(evento.fecha_limite_oferta);
        const precioEfectivoPrimera = esPrecioOferta
            ? (evento.costo_oferta_primera || evento.costo_primera_cat || 0)
            : (evento?.costo_primera_cat || 0);
        const precioEfectivoAdicional = esPrecioOferta
            ? (evento.costo_oferta_adicional || evento.costo_adicional || 0)
            : (evento?.costo_adicional || 0);

        res.render('eventos/inscripcion', {
            eventoActual: evento || { nombre: 'Sin evento activo', estado: 'cerrado', id: null },
            arrayAtletas: arrayAtletas || [],
            arrayCategorias,
            arrayPreparadores: arrayPreparadores || [],
            precioEfectivoPrimera,
            precioEfectivoAdicional,
            esPrecioOferta: !!esPrecioOferta
        });
    } catch (error) {
        console.error('Error al cargar inscripción:', error.message);
        res.render('eventos/inscripcion', {
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
                    supabaseAdmin
                        .from('competidores')
                        .update({ numero_atleta: numeros[i] })
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
    const { evento } = req.query; // Capturamos el ID del evento desde el query param
    try { // Buscamos el evento específico por su ID y que esté en estado 'inscripcion'
        const { data: eventoEspecifico, error } = await supabaseAdmin
            .from('eventos')
            .select(`
                id,
                nombre,
                lugar,
                fecha_inicio,
                costo_primera_cat,
                costo_adicional,
                fecha_limite_oferta,
                costo_oferta_primera,
                costo_oferta_adicional,
                eventos_categorias (
                    id,
                    categoria_id,
                    categorias (nombre, modalidad, disciplina, division, sexo)
                )
            `)
            .eq('estado', 'inscripcion')
            .eq('id', evento) // Filtramos por el ID del evento
            .single(); // Esperamos un solo resultado

        if (error) throw error;

        if (!eventoEspecifico) {
            // Si Supabase no devuelve un evento (ej. no existe o no está en estado 'inscripcion')
            console.warn(`Evento ${evento} no encontrado o no está en estado 'inscripcion'.`);
            return res.render('eventos/InscripcionAtleta', {
                eventos: [], // No se encontró el evento
                eventoId: evento,
                atleta: null,
                error: "El evento especificado no existe o no está abierto para inscripción."
            });
        }

        // Buscamos los datos del atleta logueado para el filtrado inteligente
        const { data: atleta } = await supabaseAdmin
            .from('atletas')
            .select('nombre, fecha_nacimiento, sexo')
            .eq('id', res.locals.user.id)
            .single();

        // Categorías ya inscritas por este atleta en este evento
        const { data: yaInscritas } = await supabaseAdmin
            .from('competidores')
            .select('evento_cat_id')
            .eq('atleta_id', res.locals.user.id)
            .eq('id_evento', evento);

        const categoriasInscritas = (yaInscritas || []).map(c => c.evento_cat_id);

        res.render('eventos/InscripcionAtleta', {
            eventos: [eventoEspecifico],
            eventoId: evento,
            atleta: atleta || null,
            categoriasInscritas
        });
    } catch (error) {
        console.error('Error en InscripcionAtleta:', error.message);
        res.status(500).render('eventos/InscripcionAtleta', { eventos: [], eventoId: evento, atleta: null, categoriasInscritas: [], error: "Ocurrió un error interno al cargar la página de inscripción." });
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
        res.render('eventos/pesaje', {
            atletas: atletas || [],
            juezLogueado: res.locals.user
        });
    } catch (error) {
        console.error('Error en pesaje:', error.message);
        res.render('eventos/pesaje', { 
            atletas: [], 
            error: error.message,
            juezLogueado: res.locals.user 
        });
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
    const { atleta_id, id_evento, categoriasElegidas, preparador_id } = req.body;
    const juez_id = res.locals.user?.id;

    if (!atleta_id || !id_evento || !categoriasElegidas || categoriasElegidas.length === 0) {
        return res.status(400).json({ estado: false, mensaje: 'Datos incompletos para la inscripción.' });
    }

    try {
        // 1. Obtener datos del evento para validación de costos y fechas
        const { data: evento, error: errEv } = await supabaseAdmin
            .from('eventos')
            .select('*')
            .eq('id', id_evento)
            .single();

        if (errEv || !evento) throw new Error('Evento no encontrado para validación de costos.');

        const ahora = new Date();
        const fechaLimite = evento.fecha_limite_oferta ? new Date(evento.fecha_limite_oferta) : null;
        const esPrecioOferta = fechaLimite && ahora <= fechaLimite;

        // Determinamos los precios aplicables según la lógica de oferta (Early Bird)
        const p1 = esPrecioOferta ? (evento.costo_oferta_primera || evento.costo_primera_cat) : (evento.costo_primera_cat || 0);
        const pA = esPrecioOferta ? (evento.costo_oferta_adicional || evento.costo_adicional) : (evento.costo_adicional || 0);

        const categoriasArray = Array.isArray(categoriasElegidas) ? categoriasElegidas : [categoriasElegidas];

        const registrosCompetidores = categoriasArray.map((eventoCatId, index) => ({
            atleta_id,
            evento_cat_id: eventoCatId,
            id_evento,
            juez_id,
            estatus_pesaje: 'aprobado',
            salida: 0,
            monto_total: index === 0 ? p1 : pA, // Guardamos el costo individual aplicado a cada categoría
            uso_oferta: esPrecioOferta
        }));

        const { error: errComp } = await supabaseAdmin
            .from('competidores')
            .insert(registrosCompetidores);

        if (errComp) throw errComp;

        const updateAtleta = { descargo_firmado: true, fecha_firma_descargo: new Date().toISOString(), juez_firma_id: juez_id };
        if (preparador_id) updateAtleta.preparador_id = preparador_id;

        const { error: errAtleta } = await supabaseAdmin
            .from('atletas')
            .update(updateAtleta)
            .eq('id', atleta_id);

        if (errAtleta) console.error('Error actualizando atleta post-inscripción:', errAtleta.message);

        res.json({ estado: true, mensaje: '¡Inscripción oficializada y categorías registradas con éxito!' });
    } catch (error) {
        console.error('🔥 Error en Inscripción Asistida:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const subirMusicaAsistida = async (req, res) => {
    const { atletaId, eventoId } = req.body;
    if (!atletaId || !eventoId) return res.status(400).json({ error: 'Faltan parámetros' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

    try {
        const ext = (req.file.originalname.split('.').pop() || 'mp3').toLowerCase();
        const filePath = `${atletaId}/${eventoId}/musica.${ext}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('musica_atletas')
            .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseAdmin.storage.from('musica_atletas').getPublicUrl(filePath);
        const urlMusica = `${urlData.publicUrl}?t=${Date.now()}`;

        await supabaseAdmin.from('competidores')
            .update({ musica_url: urlMusica })
            .eq('atleta_id', atletaId)
            .eq('id_evento', eventoId);

        res.json({ ok: true, url: urlMusica });
    } catch (error) {
        console.error('Error subiendo música asistida:', error.message);
        res.status(500).json({ error: error.message });
    }
};

const fichaAtleta = async (req, res) => {
    const { atletaId, eventoId } = req.query;
    if (!atletaId || !eventoId) return res.status(400).json({ error: 'Faltan parámetros' });

    try {
        const [{ data: atleta }, { data: competidores }] = await Promise.all([
            supabaseAdmin.from('atletas').select('preparador_id').eq('id', atletaId).single(),
            supabaseAdmin.from('competidores').select('evento_cat_id, musica_url').eq('atleta_id', atletaId).eq('id_evento', eventoId)
        ]);

        res.json({
            preparador_id: atleta?.preparador_id || null,
            categoriasInscritas: (competidores || []).map(c => c.evento_cat_id).filter(Boolean),
            musicaUrl: (competidores || []).map(c => c.musica_url).find(Boolean) || null
        });
    } catch (error) {
        console.error('Error ficha atleta:', error.message);
        res.status(500).json({ error: error.message });
    }
};

const inscribirAtleta = async (req, res) => {
    const atletaId = res.locals.user?.id;
    if (!atletaId) return res.status(401).json({ error: 'Sesión expirada' });

    const { catEventoIds, eventoId } = req.body;
    if (!Array.isArray(catEventoIds) || catEventoIds.length === 0 || !eventoId) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Obtener precios del evento para calcular monto (Early Bird si aplica)
    const { data: evento } = await supabaseAdmin
        .from('eventos').select('costo_primera_cat, costo_adicional, costo_oferta_primera, costo_oferta_adicional, fecha_limite_oferta')
        .eq('id', eventoId).single();

    const ahora = new Date();
    const esPrecioOferta = evento?.fecha_limite_oferta && ahora <= new Date(evento.fecha_limite_oferta);
    const p1 = esPrecioOferta ? (evento.costo_oferta_primera || evento.costo_primera_cat || 0) : (evento.costo_primera_cat || 0);
    const pA = esPrecioOferta ? (evento.costo_oferta_adicional || evento.costo_adicional || 0) : (evento.costo_adicional || 0);

    // Reemplazar inscripciones existentes con la nueva selección
    await supabaseAdmin.from('competidores')
        .delete()
        .eq('atleta_id', atletaId)
        .eq('id_evento', eventoId);

    const inscripciones = catEventoIds.map((id, index) => ({
        atleta_id: atletaId,
        evento_cat_id: id,
        id_evento: eventoId,
        estatus_pesaje: 'pendiente',
        salida: 0,
        monto_total: index === 0 ? p1 : pA,
        uso_oferta: !!esPrecioOferta
    }));

    const { error } = await supabaseAdmin.from('competidores').insert(inscripciones);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ ok: true });
};

const cerrarInscripcionesWeb = async (req, res) => {
    const { eventoId } = req.body;
    if (!eventoId) return res.status(400).json({ ok: false, mensaje: 'Falta eventoId' });

    const { error } = await supabaseAdmin
        .from('eventos')
        .update({ estado: 'pesaje' })
        .eq('id', eventoId);

    if (error) return res.status(500).json({ ok: false, mensaje: error.message });
    res.json({ ok: true });
};

module.exports = {
    inscripcionPage,
    asignarNumeros,
    inscripcionAtletaPage,
    crearCompetidor,
    pesajePage,
    detalleInscripcion,
    guardarInscripcionAsistida,
    inscribirAtleta,
    fichaAtleta,
    subirMusicaAsistida,
    cerrarInscripcionesWeb
};
