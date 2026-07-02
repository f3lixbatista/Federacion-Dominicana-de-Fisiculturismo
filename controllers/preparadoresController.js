const { supabase, supabaseAdmin } = require('../config/supabase');

const PUNTOS_MAP = { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

const listarPreparadores = async (req, res) => {
    try {
        const { data: preparadores, error } = await supabaseAdmin
            .from('preparadores')
            .select('*')
            .order('estatus_afiliacion', { ascending: true })
            .order('nombre_completo', { ascending: true });

        if (error) throw error;
        res.render('preparadores/gestion', { preparadores: preparadores || [] });
    } catch (error) {
        console.error('Error al listar preparadores:', error.message);
        res.render('preparadores/gestion', { preparadores: [] });
    }
};

const mostrarFormularioRegistrar = (req, res) => {
    res.render('afiliacionPreparador');
};

const registrarPreparador = async (req, res) => {
    const { nombre_completo, cedula, email, telefono, gimnasio, direccion } = req.body;
    try {
        const { error } = await supabaseAdmin
            .from('preparadores')
            .insert([{
                nombre_completo,
                cedula,
                email,
                telefono,
                gimnasio_labora: gimnasio,
                direccion,
                estatus_afiliacion: 'habilitado'
            }]);
        if (error) throw error;
        res.redirect('/preparadores');
    } catch (error) {
        console.error('Error registrando preparador:', error.message);
        res.render('afiliacionPreparador', { error: error.message, nombre_completo, cedula });
    }
};

const habilitarPreparador = async (req, res) => {
    const { id } = req.params;
    const { accion } = req.body;
    const nuevoEstatus = accion === 'suspender' ? 'suspendido' : 'habilitado';
    try {
        const { error } = await supabaseAdmin
            .from('preparadores')
            .update({ estatus_afiliacion: nuevoEstatus })
            .eq('id', id);
        if (error) throw error;
        res.json({ estado: true, mensaje: `Coach ${nuevoEstatus === 'habilitado' ? 'habilitado' : 'suspendido'} correctamente.` });
    } catch (err) {
        console.error('Error habilitando preparador:', err.message);
        res.status(500).json({ estado: false, mensaje: err.message });
    }
};

const verPanel = async (req, res) => {
    const userEmail = res.locals.user?.email;
    const userId = res.locals.user?.id;

    try {
        // Buscar el registro de preparador por email o por user_id si existe
        let { data: prep } = await supabaseAdmin
            .from('preparadores')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

        // Admin: puede ver el panel de cualquier coach por ?id=
        if (!prep && req.query.id && res.locals.user?.role === 'admin') {
            const { data: prepById } = await supabaseAdmin
                .from('preparadores').select('*').eq('id', req.query.id).single();
            prep = prepById;
        }

        if (!prep) {
            return res.render('preparadores/panel', {
                prep: null,
                atletas: [],
                estadisticas: { eventos: 0, medallas_oro: 0, podios: 0, puntos: 0 },
                historialEventos: []
            });
        }

        // Atletas del coach
        const { data: atletas } = await supabaseAdmin
            .from('atletas')
            .select('id, nombre, cedula, estatus_afiliacion, foto_url, sexo, fecha_nacimiento')
            .eq('preparador_id', prep.id)
            .order('nombre', { ascending: true });

        const atletaIds = (atletas || []).map(a => a.id);
        let estadisticas = { eventos: 0, medallas_oro: 0, podios: 0, puntos: 0 };
        let historialEventos = [];

        if (atletaIds.length > 0) {
            const { data: participaciones } = await supabaseAdmin
                .from('competidores')
                .select(`
                    posicion_final, es_ganador_absoluto, id_evento, atleta_id,
                    atletas(nombre),
                    eventos(id, nombre, fecha_inicio, estado),
                    eventos_categorias(categorias(nombre))
                `)
                .in('atleta_id', atletaIds)
                .not('posicion_final', 'is', null)
                .order('created_at', { ascending: false });

            const puntosTotal = (participaciones || []).reduce((sum, p) => {
                sum += PUNTOS_MAP[p.posicion_final] || 0;
                if (p.es_ganador_absoluto) sum += 11;
                return sum;
            }, 0);

            const eventosUnicos = new Set((participaciones || []).map(p => p.id_evento));

            estadisticas = {
                eventos: eventosUnicos.size,
                medallas_oro: (participaciones || []).filter(p => p.posicion_final === 1).length,
                podios: (participaciones || []).filter(p => p.posicion_final <= 3).length,
                puntos: puntosTotal
            };

            // Agrupar participaciones por evento
            const eventoMap = {};
            (participaciones || []).forEach(p => {
                const evId = p.id_evento;
                if (!eventoMap[evId]) {
                    eventoMap[evId] = {
                        evento: p.eventos,
                        participaciones: []
                    };
                }
                eventoMap[evId].participaciones.push({
                    atleta: p.atletas?.nombre || '—',
                    categoria: p.eventos_categorias?.categorias?.nombre || '—',
                    posicion: p.posicion_final,
                    absoluto: p.es_ganador_absoluto,
                    puntos: (PUNTOS_MAP[p.posicion_final] || 0) + (p.es_ganador_absoluto ? 11 : 0)
                });
            });

            historialEventos = Object.values(eventoMap).slice(0, 10);
        }

        res.render('preparadores/panel', { prep, atletas: atletas || [], estadisticas, historialEventos });
    } catch (error) {
        console.error('Error en panel coach:', error.message);
        res.status(500).send('Error al cargar el panel del coach');
    }
};

const verRankingTeams = async (req, res) => {
    const { evento_id } = req.query;
    try {
        const { data: eventos } = await supabaseAdmin
            .from('eventos')
            .select('id, nombre, estado')
            .order('fecha_inicio', { ascending: false });

        let participacionesQuery = supabaseAdmin
            .from('competidores')
            .select(`
                posicion_final, es_ganador_absoluto, id_evento,
                atletas(nombre, preparadores(id, nombre_completo, gimnasio_labora))
            `)
            .not('posicion_final', 'is', null);

        if (evento_id) {
            participacionesQuery = participacionesQuery.eq('id_evento', evento_id);
        }

        const [{ data: participaciones }, { data: eventoSel }] = await Promise.all([
            participacionesQuery,
            evento_id
                ? supabaseAdmin.from('eventos').select('id, nombre').eq('id', evento_id).single()
                : Promise.resolve({ data: null })
        ]);

        const teamsRaw = {};
        (participaciones || []).forEach(p => {
            const prep = p.atletas?.preparadores;
            const teamName = prep?.nombre_completo || 'Independientes';
            const teamGym = prep?.gimnasio_labora || '—';

            if (!teamsRaw[teamName]) {
                teamsRaw[teamName] = { nombre: teamName, gimnasio: teamGym, puntos: 0, medallas_oro: 0, podios: 0, participaciones: 0 };
            }
            teamsRaw[teamName].participaciones++;
            teamsRaw[teamName].puntos += PUNTOS_MAP[p.posicion_final] || 0;
            if (p.es_ganador_absoluto) teamsRaw[teamName].puntos += 11;
            if (p.posicion_final === 1) teamsRaw[teamName].medallas_oro++;
            if (p.posicion_final <= 3) teamsRaw[teamName].podios++;
        });

        const ranking = Object.values(teamsRaw)
            .sort((a, b) => b.puntos - a.puntos || b.medallas_oro - a.medallas_oro || b.podios - a.podios);

        res.render('preparadores/ranking_teams', {
            ranking,
            eventos: eventos || [],
            evento_id: evento_id || '',
            eventoSeleccionado: eventoSel || null
        });
    } catch (error) {
        console.error('Error ranking teams:', error.message);
        res.status(500).send('Error al calcular el ranking de equipos');
    }
};

module.exports = {
    listarPreparadores,
    mostrarFormularioRegistrar,
    registrarPreparador,
    habilitarPreparador,
    verPanel,
    verRankingTeams
};
