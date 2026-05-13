const express = require('express');
const routerEventos = express.Router();
const { checkRole } = require('../middlewares/auth');
const eventosController = require('../controllers/eventosController');
const supabase = require('../supabaseClient');

// A. LISTADO GLOBAL: Lo que ve todo el mundo al entrar
routerEventos.get('/', async (req, res) => {
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
});

// B. DASHBOARD DEL EVENTO: La página única para cada competencia
routerEventos.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error } = await supabase
            .from('eventos')
            .select(`
                *,
                eventos_categorias (
                    id,
                    categorias (*)
                )
            `)
            .eq('id', id)
            .single();

        if (error || !evento) return res.redirect('/eventos');

        let listadoPublico = [];
        if (['en_progreso', 'finalizado'].includes(evento.estado)) {
            const { data: categoriasPublicas, error: categoriasError } = await supabase
                .from('eventos_categorias')
                .select('id, orden_secuencia_categoria, categorias(nombre)')
                .eq('evento_id', id)
                .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
                .order('orden_secuencia_categoria', { ascending: true });

            if (!categoriasError && categoriasPublicas) {
                for (const cat of categoriasPublicas) {
                    const { data: competidores, error: competidoresError } = await supabase
                        .from('competidores')
                        .select('numero_atleta, numero_competidor, nombre, gimnasio, preparador')
                        .eq('evento_cat_id', cat.id)
                        .eq('id_evento', id)
                        .order('numero_atleta', { ascending: true })
                        .order('created_at', { ascending: true });

                    if (competidoresError) continue;

                    listadoPublico.push({
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
            }
        }

        res.render('eventos/dashboard', { evento, listadoPublico });
    } catch (error) {
        res.redirect('/eventos');
    }
});

// RUTA DE PREPARACIÓN DE EVENTO (alias compatible con la estructura anterior)
routerEventos.get('/preparacion-evento/:id', checkRole(['admin', 'estadistico']), eventosController.prepararEventoPage);

// RUTA PÚBLICA DE MONITOR MC
routerEventos.get('/:id/monitor-mc', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Obtener la información base del evento y su guion
        const { data: evento, error: errEv } = await supabase
            .from('eventos')
            .select('id, nombre, cronograma_mc')
            .eq('id', id)
            .single();

        if (errEv || !evento) return res.redirect('/eventos');

        // 2. Traer TODAS las sillas configuradas para este evento con los nombres de los jueces
        const { data: todasLasSillas, error: errSillas } = await supabase
            .from('panel_sillas_jueces')
            .select(`
                numero_silla,
                paneles_jueces ( id, numero_panel ),
                profiles ( id, nombre )
            `)
            .eq('paneles_jueces.id_evento', id);

        // 3. Filtrar y estructurar el Panel 1 (Mesa Principal)
        const sillasPanel1 = (todasLasSillas || [])
            .filter(s => s.paneles_jueces && s.paneles_jueces.numero_panel === 1)
            .sort((a, b) => a.numero_silla - b.numero_silla)
            .map(s => ({
                silla: s.numero_silla,
                nombre: s.profiles?.nombre || 'Juez no asignado',
                id: s.profiles?.id
            }));

        // 4. Filtrar los Jueces de Relevo (Están en Paneles > 1 y NO pertenecen al Panel 1)
        const idsJuecesPanel1 = sillasPanel1.map(j => j.id);
        
        const setJuecesAlternos = new Set();
        (todasLasSillas || []).forEach(s => {
            if (s.paneles_jueces && s.paneles_jueces.numero_panel > 1 && s.profiles) {
                if (!idsJuecesPanel1.includes(s.profiles.id)) {
                    setJuecesAlternos.add(s.profiles.nombre);
                }
            }
        });
        const juecesRelevo = Array.from(setJuecesAlternos);

        // 5. Renderizar enviando las listas limpias al EJS
        res.render('eventos/monitor_mc', { 
            evento, 
            panelPrincipal: sillasPanel1, 
            juecesRelevo: juecesRelevo 
        });

    } catch (error) {
        console.error("🔥 Error cargando el jurado para el MC:", error.message);
        res.redirect('/eventos');
    }
});

routerEventos.get('/:id/preparacion', checkRole(['ejecutivo', 'admin']), eventosController.prepararEventoPage);
routerEventos.post('/preparacion/oficializar', checkRole(['ejecutivo', 'admin']), eventosController.oficializarPreparacion);

// RUTA PARA MESA DE CÓMPUTO ESTADÍSTICO
routerEventos.get('/:id/computo/:catId', checkRole(['estadistico', 'admin']), async (req, res) => {
    const { id, catId } = req.params;
    const { fase = 'final' } = req.query; // Default to 'final' if not provided

    try {
        // Fetch event details
        const { data: evento, error: eventoError } = await supabase
            .from('eventos')
            .select('id, nombre')
            .eq('id', id)
            .single();

        if (eventoError || !evento) return res.redirect('/eventos');

        // Fetch category details
        const { data: catRel, error: catError } = await supabase
            .from('eventos_categorias')
            .select('id, categorias(nombre)')
            .eq('id', catId)
            .single();

        if (catError || !catRel) return res.redirect(`/eventos/${id}`);

        // Fetch judges for the event
        const { data: jueces, error: juecesError } = await supabase
            .from('jueces_eventos')
            .select('jueces(id, nombre)')
            .eq('evento_id', id);

        if (juecesError) throw juecesError;

        // Fetch athletes for the category
        const { data: atletas, error: atletasError } = await supabase
            .from('competidores')
            .select('id, numero_atleta, nombre')
            .eq('evento_cat_id', catId)
            .eq('id_evento', id)
            .order('numero_atleta', { ascending: true });

        if (atletasError) throw atletasError;

        // Fetch existing votes for the phase
        const { data: votos, error: votosError } = await supabase
            .from('votaciones_jueces')
            .select('juez_id, atleta_id, posicion_asignada')
            .eq('id_evento', id)
            .eq('evento_cat_id', catId)
            .eq('fase_competencia', fase);

        if (votosError) throw votosError;

        // Build mapaVotos: { atletaId: { juezId: posicion } }
        const mapaVotos = {};
        atletas.forEach(atleta => {
            mapaVotos[atleta.id] = {};
        });
        votos.forEach(voto => {
            if (mapaVotos[voto.atleta_id]) {
                mapaVotos[voto.atleta_id][voto.juez_id] = voto.posicion_asignada;
            }
        });

        res.render('eventos/computo', {
            eventoId: id,
            catRelId: catId,
            categoriaNombre: catRel.categorias.nombre,
            jueces: jueces.map(j => j.jueces),
            atletas: atletas.map(a => ({ id: a.id, dorsal: a.numero_atleta, nombre: a.nombre })),
            mapaVotos
        });
    } catch (error) {
        console.error('Error cargando mesa de cómputo:', error);
        res.status(500).send('Error al cargar la mesa de cómputo: ' + error.message);
    }
});

// RUTA PARA INYECTAR JUECES CONFIRMADOS AL MC EN TIEMPO REAL
routerEventos.post('/:id/inyectar-jueces-mc', checkRole(['admin', 'estadistico']), async (req, res) => {
    const { id } = req.params;
    const { panelId } = req.body; // El estadístico envía el ID del panel que acaba de confirmar

    try {
        // 1. Traer las sillas configuradas con los nombres de los jueces para este panel específico
        const { data: sillasPanel, error: errPanel } = await supabase
            .from('panel_sillas_jueces')
            .select(`
                numero_silla,
                paneles_jueces!inner(id, numero_panel),
                profiles(id, nombre)
            `)
            .eq('panel_id', panelId);

        if (errPanel) throw errPanel;

        // 2. Traer TODOS los jueces asignados al evento (para extraer relevos)
        const { data: todosJuecesEvento, error: errTodos } = await supabase
            .from('paneles_jueces')
            .select(`
                id,
                numero_panel,
                panel_sillas_jueces(profiles(id, nombre))
            `)
            .eq('id_evento', id);

        if (errTodos) throw errTodos;

        // 3. Estructurar la lista del Panel Seleccionado (Mesa Activa)
        const listaPanelActivo = (sillasPanel || [])
            .sort((a, b) => a.numero_silla - b.numero_silla)
            .map(s => ({
                silla: s.numero_silla,
                nombre: s.profiles?.nombre || 'Juez de Mesa'
            }));

        // 4. Filtrar los Jueces de Relevo (Los que están en otros paneles y no en el activo)
        const nombresPanelActivo = new Set(listaPanelActivo.map(j => j.nombre));
        const juecesRelevo = [];

        todosJuecesEvento.forEach(panel => {
            if (panel.panel_sillas_jueces) {
                panel.panel_sillas_jueces.forEach(silla => {
                    if (silla.profiles && !nombresPanelActivo.has(silla.profiles.nombre)) {
                        juecesRelevo.push(silla.profiles.nombre);
                    }
                });
            }
        });

        // Eliminar duplicados
        const juecesRelevoUnicos = [...new Set(juecesRelevo)];

        // 5. Empaquetar el bloque de protocolo para el MC
        const paqueteJuecesMC = {
            tipo_alerta: 'presentacion_jueces',
            timestamp: new Date().toISOString(),
            panel_numero: sillasPanel?.[0]?.paneles_jueces?.numero_panel || 1,
            jueces_mesa: listaPanelActivo,
            jueces_relevo: juecesRelevoUnicos
        };

        // 6. Inyectamos los datos en la columna en vivo del evento (esto dispara el realtime)
        const { error: updateError } = await supabase
            .from('eventos')
            .update({ resultados_en_vivo: paqueteJuecesMC })
            .eq('id', id);

        if (updateError) throw updateError;

        res.json({ estado: true, mensaje: "Cuerpo de Jueces confirmado e inyectado en la pantalla del MC." });

    } catch (error) {
        console.error("🔥 Error inyectando jueces en vivo:", error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
});

// RUTA GET: Validación de Asiento y Renderizado de Boleta Digital para el Juez
routerEventos.get('/:id/votacion', checkRole(['admin', 'juez']), async (req, res) => {
    const { id: eventoId } = req.params;
    const juezId = req.user?.id; // Capturamos el UUID del juez desde la sesión blindada
    const { fase = 'final' } = req.query; // Por defecto asumimos fase de finales si no se especifica

    try {
        // 1. Validar el estado del evento (Debe estar en progreso)
        const { data: evento, error: errEv } = await supabase
            .from('eventos')
            .select('id, nombre, estado')
            .eq('id', eventoId)
            .single();

        if (errEv || !evento) return res.redirect('/eventos');
        if (evento.estado !== 'en_progreso') {
            return res.send("<h3>Acceso Restringido</h3><p>El evento no se encuentra en fase de competencia activa.</p>");
        }

        // 2. DETECTOR DE ASIENTO: Buscar en qué panel y silla está sentado este juez actualmente
        // Cruzamos con la tabla de paneles del evento para asegurar el contexto correcto
        const { data: asiento, error: errAsiento } = await supabase
            .from('panel_sillas_jueces')
            .select(`
                numero_silla,
                panel_id,
                paneles_jueces!inner(id, numero_panel, id_evento)
            `)
            .eq('juez_id', juezId)
            .eq('paneles_jueces.id_evento', eventoId)
            .limit(1)
            .single();

        // Si el juez no está asignado a ninguna silla en la mesa de control del Estadístico
        if (errAsiento || !asiento) {
            return res.send("<h3>Mesa de Control FDFF</h3><p>Su usuario no está asignado a ninguna silla técnica en este bloque. Comuníquese con el Juez Estadístico.</p>");
        }

        // 3. IDENTIFICAR CATEGORÍA ACTIVA: Buscamos la categoría de menor orden que esté activa
        const { data: catActiva, error: errCat } = await supabase
            .from('eventos_categorias')
            .select(`
                id,
                orden_secuencia_categoria,
                categorias(id, nombre, modalidad, division)
            `)
            .eq('evento_id', eventoId)
            .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion'])
            .order('orden_secuencia_categoria', { ascending: true })
            .limit(1)
            .single();

        if (errCat || !catActiva) {
            return res.send("<h3>Fase Logística</h3><p>No hay categorías activas listas para evaluación en este momento.</p>");
        }

        // 4. CARGAR ATLETAS OFICIALES: Traemos a los atletas inscritos con sus dorsales ya asignados
        const { data: competidores, error: errComp } = await supabase
            .from('competidores')
            .select(`
                id,
                numero_atleta,
                atletas(id, nombre)
            `)
            .eq('evento_cat_id', catActiva.id)
            .eq('id_evento', eventoId)
            .order('numero_atleta', { ascending: true });

        if (errComp || !competidores || competidores.length === 0) {
            return res.send("<h3>Listado de Competidores</h3><p>No se encontraron atletas con dorsales oficiales en esta categoría.</p>");
        }

        // Mapeamos los datos limpios para la estructura de la boleta digital
        const atletasLimpios = competidores.map(c => ({
            id: c.atletas.id, // ID del atleta para la votación
            dorsal: c.numero_atleta || '---',
            nombre: c.atletas.nombre
        }));

        // Estructuramos el objeto de información del panel para la cabecera de la boleta
        const infoPanelEstructurada = {
            panel_id: asiento.panel_id,
            numero_panel: asiento.paneles_jueces.numero_panel,
            numero_silla: asiento.numero_silla
        };

        // 5. RENDERIZAR BOLETA DIGITAL OFICIAL
        // Surtimos la vista con todos los datos validados del evento y el competidor
        res.render('eventos/boleta', {
            eventoId: eventoId,
            catRelId: catActiva.id,
            categoriaNombre: `${catActiva.categorias.nombre} (${catActiva.categorias.division || 'Abierta'})`,
            fase: fase,
            infoPanel: infoPanelEstructurada,
            atletas: atletasLimpios,
            user: req.user
        });

    } catch (error) {
        console.error("🔥 Error crítico en el enrutamiento de la boleta:", error.message);
        res.status(500).send("Error de conexión al cargar la boleta digital oficial.");
    }
});

module.exports = routerEventos;
