const supabase = require('../supabaseClient');

const listarEventos = async (req, res) => {
    try {
        const { data: eventos, error } = await supabase
            .from('eventos')
            .select('*')
            .order('fecha_inicio', { ascending: false });

        if (error) throw error;
        res.render('eventos/lista', { eventos });
    } catch (error) {
        res.status(500).send('Error al cargar eventos: ' + error.message);
    }
};

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
        
        const relIds = (relaciones || []).map(r => r.id);
        
        const { data: allCompetidores, error: errComps } = await supabase
            .from('competidores')
            .select(`
                id,
                evento_cat_id,
                atletas (
                    nombre,
                    cedula,
                    gimnasio,
                    peso,
                    estatura
                )
            `)
            .in('evento_cat_id', relIds)
            .eq('id_evento', eventoId)
            .eq('estatus_pesaje', 'aprobado');

        if (errComps) throw errComps;

        const compsByCat = (allCompetidores || []).reduce((acc, c) => {
            if (!acc[c.evento_cat_id]) acc[c.evento_cat_id] = [];
            acc[c.evento_cat_id].push({
                id: c.id,
                nombre: c.atletas?.nombre || 'Sin nombre',
                cedula: c.atletas?.cedula || 'Sin cédula',
                gimnasio: c.atletas?.gimnasio || 'Independiente',
                peso: c.atletas?.peso || '--',
                estatura: c.atletas?.estatura || '--'
            });
            return acc;
        }, {});

        const arrayCategorias = [];

        for (const rel of relaciones || []) {
            const atletasLimpios = compsByCat[rel.id] || [];

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

const verMonitorMC = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error: errEv } = await supabase
            .from('eventos')
            .select('id, nombre, cronograma_mc')
            .eq('id', id)
            .single();

        if (errEv || !evento) return res.redirect('/eventos');

        const { data: todasLasSillas, error: errSillas } = await supabase
            .from('panel_sillas_jueces')
            .select(`
                numero_silla,
                paneles_jueces ( id, numero_panel ),
                profiles ( id, nombre )
            `)
            .eq('paneles_jueces.id_evento', id);

        const sillasPanel1 = (todasLasSillas || [])
            .filter(s => s.paneles_jueces && s.paneles_jueces.numero_panel === 1)
            .sort((a, b) => a.numero_silla - b.numero_silla)
            .map(s => ({
                silla: s.numero_silla,
                nombre: s.profiles?.nombre || 'Juez no asignado',
                id: s.profiles?.id
            }));

        const idsJuecesPanel1 = sillasPanel1.map(j => j.id);
        const setJuecesAlternos = new Set();
        (todasLasSillas || []).forEach(s => {
            if (s.paneles_jueces && s.paneles_jueces.numero_panel > 1 && s.profiles) {
                if (!idsJuecesPanel1.includes(s.profiles.id)) {
                    setJuecesAlternos.add(s.profiles.nombre);
                }
            }
        });

        res.render('eventos/monitor_mc', { 
            evento, 
            panelPrincipal: sillasPanel1, 
            juecesRelevo: Array.from(setJuecesAlternos) 
        });
    } catch (error) {
        res.redirect('/eventos');
    }
};

const verMesaComputo = async (req, res) => {
    const { id, catId } = req.params;
    const { fase = 'final' } = req.query;
    try {
        const { data: evento } = await supabase.from('eventos').select('id, nombre').eq('id', id).single();
        const { data: catRel } = await supabase.from('eventos_categorias').select('id, categorias(nombre)').eq('id', catId).single();
        const { data: jueces } = await supabase.from('jueces_eventos').select('jueces(id, nombre)').eq('evento_id', id);
        const { data: atletas } = await supabase.from('competidores').select('id, numero_atleta, nombre').eq('evento_cat_id', catId).order('numero_atleta', { ascending: true });
        const { data: votos } = await supabase.from('votaciones_jueces').select('juez_id, atleta_id, posicion_asignada').eq('id_evento', id).eq('evento_cat_id', catId).eq('fase_competencia', fase);

        const mapaVotos = {};
        (atletas || []).forEach(a => mapaVotos[a.id] = {});
        (votos || []).forEach(v => { if (mapaVotos[v.atleta_id]) mapaVotos[v.atleta_id][v.juez_id] = v.posicion_asignada; });

        res.render('eventos/computo', {
            eventoId: id,
            catRelId: catId,
            categoriaNombre: catRel?.categorias?.nombre,
            jueces: (jueces || []).map(j => j.jueces),
            atletas: (atletas || []).map(a => ({ id: a.id, dorsal: a.numero_atleta, nombre: a.nombre })),
            mapaVotos
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const inyectarJuecesMC = async (req, res) => {
    const { id } = req.params;
    const { panelId } = req.body;
    try {
        const { data: sillasPanel } = await supabase
            .from('panel_sillas_jueces')
            .select(`numero_silla, paneles_jueces!inner(id, numero_panel), profiles(id, nombre)`)
            .eq('panel_id', panelId);

        const { data: todosJuecesEvento } = await supabase
            .from('paneles_jueces')
            .select(`id, numero_panel, panel_sillas_jueces(profiles(id, nombre))`)
            .eq('id_evento', id);

        const listaPanelActivo = (sillasPanel || []).sort((a, b) => a.numero_silla - b.numero_silla).map(s => ({
            silla: s.numero_silla,
            nombre: s.profiles?.nombre || 'Juez de Mesa'
        }));

        const nombresPanelActivo = new Set(listaPanelActivo.map(j => j.nombre));
        const juecesRelevo = [];
        (todosJuecesEvento || []).forEach(panel => {
            panel.panel_sillas_jueces?.forEach(silla => {
                if (silla.profiles && !nombresPanelActivo.has(silla.profiles.nombre)) juecesRelevo.push(silla.profiles.nombre);
            });
        });

        const paqueteJuecesMC = {
            tipo_alerta: 'presentacion_jueces',
            timestamp: new Date().toISOString(),
            panel_numero: sillasPanel?.[0]?.paneles_jueces?.numero_panel || 1,
            jueces_mesa: listaPanelActivo,
            jueces_relevo: [...new Set(juecesRelevo)]
        };

        await supabase.from('eventos').update({ resultados_en_vivo: paqueteJuecesMC }).eq('id', id);
        res.json({ estado: true, mensaje: "Jueces inyectados." });
    } catch (error) {
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const verBoletaJuez = async (req, res) => {
    const { id: eventoId } = req.params;
    const juezId = req.user?.id;
    const { fase = 'final' } = req.query;

    try {
        const { data: evento } = await supabase.from('eventos').select('id, nombre, estado').eq('id', eventoId).single();
        if (!evento || evento.estado !== 'en_progreso') return res.send("Acceso Restringido.");

        const { data: asiento } = await supabase
            .from('panel_sillas_jueces')
            .select(`numero_silla, panel_id, paneles_jueces!inner(id, numero_panel, id_evento)`)
            .eq('juez_id', juezId)
            .eq('paneles_jueces.id_evento', eventoId)
            .single();

        if (!asiento) return res.send("Juez no asignado.");

        const { data: catActiva } = await supabase
            .from('eventos_categorias')
            .select(`id, categorias(id, nombre, division)`)
            .eq('evento_id', eventoId)
            .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
            .order('orden_secuencia_categoria', { ascending: true })
            .limit(1).single();

        if (!catActiva) return res.send("No hay categorías activas.");

        const { data: competidores } = await supabase
            .from('competidores')
            .select(`id, numero_atleta, atletas(id, nombre)`)
            .eq('evento_cat_id', catActiva.id)
            .eq('id_evento', eventoId)
            .order('numero_atleta', { ascending: true });

        res.render('eventos/boleta', {
            eventoId,
            catRelId: catActiva.id,
            categoriaNombre: `${catActiva.categorias.nombre}`,
            fase,
            infoPanel: { panel_id: asiento.panel_id, numero_panel: asiento.paneles_jueces.numero_panel, numero_silla: asiento.numero_silla },
            atletas: (competidores || []).map(c => ({ id: c.atletas.id, dorsal: c.numero_atleta || '---', nombre: c.atletas.nombre })),
            user: req.user
        });
    } catch (error) {
        res.status(500).send("Error de conexión.");
    }
};

const verReporteOficial = async (req, res) => {
    const { id: eventoId } = req.params;
    try {
        const { data: evento } = await supabase.from('eventos').select('*').eq('id', eventoId).single();
        const { data: relaciones } = await supabase
            .from('eventos_categorias')
            .select(`
                id,
                categorias ( nombre, modalidad ),
                competidores ( id, numero_atleta, posicion_final, atletas ( nombre, provincia, gimnasio ) )
            `)
            .eq('evento_id', eventoId)
            .neq('estatus_logistica', 'cerrada')
            .order('orden_secuencia_categoria', { ascending: true });

        const reporteData = (relaciones || []).map(rel => {
            let atletas = rel.competidores || [];
            atletas.sort((a, b) => (evento.estado === 'finalizado') 
                ? (a.posicion_final || 99) - (b.posicion_final || 99) 
                : (a.numero_atleta || 0) - (b.numero_atleta || 0));

            return { nombreCat: rel.categorias?.nombre, modalidad: rel.categorias?.modalidad, atletas };
        });

        // Cálculo de Ranking de Equipos (Teams)
        const { data: participaciones } = await supabase
            .from('competidores')
            .select('posicion_final, es_ganador_absoluto, atletas(preparadores(nombre_completo))')
            .eq('id_evento', eventoId)
            .not('posicion_final', 'is', null);

        const puntosMap = { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };
        const teamsRankingRaw = {};

        (participaciones || []).forEach(p => {
            const teamName = p.atletas?.preparadores?.nombre_completo || 'Independientes';
            if (!teamsRankingRaw[teamName]) teamsRankingRaw[teamName] = 0;
            
            if (puntosMap[p.posicion_final]) teamsRankingRaw[teamName] += puntosMap[p.posicion_final];
            if (p.es_ganador_absoluto) teamsRankingRaw[teamName] += 11;
        });

        const rankingTeams = Object.entries(teamsRankingRaw)
            .map(([nombre, puntos]) => ({ nombre, puntos }))
            .sort((a, b) => b.puntos - a.puntos);

        res.render('eventos/reporte_oficial', { evento, reporteData, rankingTeams });
    } catch (error) {
        res.redirect('/eventos');
    }
};

const verDashboardEvento = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento } = await supabase.from('eventos').select(`*, eventos_categorias(id, categorias(*))`).eq('id', id).single();
        if (!evento) return res.redirect('/eventos');

        let listadoPublico = [];
        if (['en_progreso', 'finalizado'].includes(evento.estado)) {
            const { data: cats } = await supabase
                .from('eventos_categorias')
                .select('id, orden_secuencia_categoria, categorias(nombre)')
                .eq('evento_id', id)
                .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
                .order('orden_secuencia_categoria', { ascending: true });

            for (const cat of (cats || [])) {
                const { data: comps } = await supabase.from('competidores').select('numero_atleta, nombre, gimnasio').eq('evento_cat_id', cat.id).order('numero_atleta', { ascending: true });
                listadoPublico.push({
                    nombre: cat.categorias?.nombre,
                    atletas: (comps || []).map(a => ({ dorsal: a.numero_atleta, nombre: a.nombre, team: a.gimnasio }))
                });
            }
        }
        res.render('eventos/dashboard', { evento, listadoPublico });
    } catch (error) {
        res.redirect('/eventos');
    }
};

const verDiplomaAtleta = async (req, res) => {
    const { idAtleta, idEvento } = req.params;
    try {
        const { data: comp, error } = await supabase
            .from('competidores')
            .select(`
                posicion_final,
                eventos(nombre, lugar, fecha_inicio),
                eventos_categorias(categorias(nombre)),
                atletas(nombre)
            `)
            .eq('atleta_id', idAtleta)
            .eq('id_evento', idEvento)
            .single();

        if (error || !comp) return res.status(404).send('Certificado no disponible.');

        res.render('eventos/diploma', { comp });
    } catch (error) {
        res.status(500).send('Error al generar diploma.');
    }
};

const verBackstage = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento } = await supabase
            .from('eventos')
            .select('id, nombre, cronograma_mc, orden_backstage')
            .eq('id', id)
            .single();

        res.render('eventos/backstage', { evento });
    } catch (e) {
        res.redirect('/eventos');
    }
};

module.exports = {
    listarEventos,
    prepararEventoPage,
    oficializarPreparacion,
    verMonitorMC,
    verMesaComputo,
    inyectarJuecesMC,
    verBoletaJuez,
    verReporteOficial,
    verDashboardEvento,
    verDiplomaAtleta,
    verBackstage
};
