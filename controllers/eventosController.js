const { supabase, supabaseAdmin } = require('../supabaseClient');
const QRCode = require('qrcode');
const webpush = require('web-push'); // Import web-push
const { z } = require('zod');

// Esquema para validar la creación de un evento
const nuevoEventoSchema = z.object({
    NombreEvento: z.string().min(3, "Nombre de evento requerido"),
    Fecha: z.string().refine(val => !isNaN(Date.parse(val)), "Fecha de inicio inválida"),
    Lugar: z.string().min(3, "Lugar requerido"),
    direccion: z.string().optional(),
    fecha_pesaje: z.string().optional(),
    lugar_pesaje: z.string().optional(),
    costo_primera: z.preprocess((val) => parseFloat(val), z.number().min(0)),
    costo_adicional: z.preprocess((val) => parseFloat(val), z.number().min(0)),
    info_pesaje: z.string().optional(),
    Categorias: z.union([z.string(), z.array(z.string())]).optional(),
    fecha_limite_oferta: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), "Fecha de oferta inválida"),
    costo_oferta_primera: z.preprocess((val) => val === '' ? undefined : parseFloat(val), z.number().min(0).optional()),
    costo_oferta_adicional: z.preprocess((val) => val === '' ? undefined : parseFloat(val), z.number().min(0).optional()),
});

// Configure web-push with VAPID keys from environment variables
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
    webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('VAPID keys or email not configured. Push notifications will not work.');
}

// Helper function for uploading to Supabase Storage
async function subirAStorage(file, bucketName, folderName) {
    if (!file) return null;
    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = `${folderName}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
    return urlData.publicUrl;
}

const listarEventos = async (req, res) => {
    try {
        const { data: eventos, error } = await supabase
            .from('eventos')
            .select('*')
            .order('fecha_inicio', { ascending: false });

        if (error) throw error;
        res.render('eventos/competencias', { eventos });
    } catch (error) {
        res.status(500).send('Error al cargar eventos: ' + error.message);
    }
};

const prepararEventoPage = async (req, res) => {
    const eventoId = req.params.id;

    try {
        const { data: evento, error: eventoError } = await supabaseAdmin
            .from('eventos')
            .select('id, nombre, estado')
            .eq('id', eventoId)
            .single();

        if (eventoError || !evento) {
            throw eventoError || new Error('Evento no encontrado');
        }

        // Traer jueces habilitados para el panel
        const { data: jueces, error: errJueces } = await supabaseAdmin
            .from('profiles')
            .select('id, nombre')
            .eq('role', 'juez');

        if (errJueces) throw errJueces;

        const { data: relaciones, error: errRel } = await supabaseAdmin
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
        
        const { data: allCompetidores, error: errComps } = await supabaseAdmin
            .from('competidores')
            .select(`
                id,
                evento_cat_id,
                atletas!inner (
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
            evento,
            juecesDisponibles: jueces || []
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
        // 1. Procesar fusiones y actualizaciones en paralelo
        const promesasLogistica = logistica.map(item => {
            const updates = [
                supabaseAdmin
                .from('eventos_categorias')
                .update({
                    orden_secuencia_categoria: item.orden,
                    estatus_logistica: item.estatus,
                    fusion_destino_id: item.fusion_destino_id || null
                })
                .eq('id', item.evento_cat_id)
            ];

            if (item.estatus === 'fusionada' && item.fusion_destino_id) {
                updates.push(supabaseAdmin.from('competidores')
                    .update({ evento_cat_id: item.fusion_destino_id })
                    .eq('evento_cat_id', item.evento_cat_id)
                    .eq('id_evento', eventoId));
            }
            return updates;
        }).flat();

        await Promise.all(promesasLogistica);

        // 2. Dorsaleo correlativo automático
        const { data: categoriasOrdenadas, error: categoriasError } = await supabaseAdmin
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
            const { data: competidores, error: competidoresError } = await supabaseAdmin
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
                    await supabaseAdmin
                        .from('competidores')
                        .update({ numero_atleta: contadorDorsal })
                        .eq('id', comp.id);
                    contadorDorsal++;
                }
            }
        }

        // 3. Cambiar el estado general del evento para habilitar fases en vivo
        await supabaseAdmin
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
        const { data: evento, error: errEv } = await supabaseAdmin
            .from('eventos')
            .select('id, nombre, cronograma_mc')
            .eq('id', id)
            .single();

        if (errEv || !evento) return res.redirect('/eventos');
        
        const { data: todasLasSillas, error: errSillas } = await supabaseAdmin
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

        const idsJuecesPanel1 = sillasPanel1.map(j => j.id); // Esto es para evitar duplicados en jueces de relevo
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

const inyectarJuecesMC = async (req, res) => {
    const { id } = req.params;
    const { panelId } = req.body;
    try {
        const { data: sillasPanel } = await supabaseAdmin
            .from('panel_sillas_jueces')
            .select(`
                numero_silla,
                paneles_jueces ( numero_panel ),
                profiles ( nombre )
            `)
            .eq('panel_id', panelId)
            .order('numero_silla', { ascending: true });

        const listaPanelActivo = (sillasPanel || []).map(s => s.profiles?.nombre || 'Juez Vacío');
        
        const { data: todasLasSillas } = await supabaseAdmin
            .from('panel_sillas_jueces')
            .select('profiles(nombre), paneles_jueces!inner(id_evento)')
            .eq('paneles_jueces.id_evento', id);

        const juecesRelevo = (todasLasSillas || [])
            .map(s => s.profiles?.nombre)
            .filter(n => n && !listaPanelActivo.includes(n));

        const paqueteJuecesMC = {
            tipo_alerta: 'presentacion_jueces',
            timestamp: new Date().toISOString(),
            panel_numero: sillasPanel?.[0]?.paneles_jueces?.numero_panel || 1,
            jueces_mesa: listaPanelActivo,
            jueces_relevo: [...new Set(juecesRelevo)]
        };

        await supabaseAdmin.from('eventos').update({ resultados_en_vivo: paqueteJuecesMC }).eq('id', id);
        res.json({ estado: true, mensaje: "Jueces inyectados." });
    } catch (error) {
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const verBoletaJuez = async (req, res) => {
    const { id: eventoId } = req.params;
    const juezId = res.locals.user?.id;
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
            user: res.locals.user
        });
    } catch (error) {
        res.status(500).send("Error de conexión.");
    }
};

const verReporteOficial = async (req, res) => {
    const { id: eventoId } = req.params;
    try {
        const { data: evento } = await supabaseAdmin.from('eventos').select('*').eq('id', eventoId).single();
        const { data: relaciones } = await supabaseAdmin
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
        const { data: participaciones } = await supabaseAdmin
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
        const { data: evento } = await supabase.from('eventos').select(`*, eventos_categorias(id, categorias!inner(*))`).eq('id', id).single();
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
                    id: cat.id,
                    nombre: cat.categorias?.nombre,
                    orden: cat.orden_secuencia_categoria,
                    total: (comps || []).length,
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

const verCentroMando = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error: errEv } = await supabaseAdmin
            .from('eventos')
            .select('*')
            .eq('id', id)
            .single();

        if (errEv || !evento) return res.redirect('/eventos');

        // Buscamos quién es el presidente asignado en el panel
        const { data: presidente } = await supabaseAdmin
            .from('panel_sillas_jueces')
            .select('profiles(nombre)')
            .eq('id_evento', id)
            .eq('es_presidente', true)
            .limit(1)
            .single();

        res.render('eventos/centro_mando', { 
            evento, 
            presidente: presidente?.profiles?.nombre || 'No asignado' 
        });
    } catch (error) {
        res.redirect('/eventos');
    }
};

const verCertificadoOficial = async (req, res) => {
    const { idAtleta, idEvento } = req.params;
    try {
        const { data: comp, error } = await supabaseAdmin
            .from('competidores')
            .select(`
                id,
                posicion_final,
                eventos ( id, nombre, lugar, fecha_inicio ),
                eventos_categorias ( categorias ( nombre ) ),
                atletas ( id, nombre )
            `)
            .eq('atleta_id', idAtleta)
            .eq('id_evento', idEvento)
            .single();

        if (error || !comp) return res.status(404).send('Certificado no disponible aún. El evento debe estar oficializado.');

        // Generar QR de validación (URL pública para verificar el logro)
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
        console.error('🔥 Error al generar certificado:', error.message);
        res.status(500).send('Error interno al procesar el certificado.');
    }
};

const validarLogroPublico = async (req, res) => {
    const { idCompetidor } = req.params;
    try {
        const { data, error } = await supabaseAdmin
            .from('competidores')
            .select(`
                id,
                numero_atleta,
                posicion_final,
                eventos ( nombre, lugar, fecha_inicio ),
                eventos_categorias ( categorias ( nombre, modalidad ) ),
                atletas ( nombre )
            `)
            .eq('id', idCompetidor)
            .single();

        if (error || !data) throw new Error("Registro de logro no encontrado.");

        res.render('eventos/validar_logro', { 
            logro: data,
            fecha: new Date().toLocaleDateString('es-DO')
        });
    } catch (error) {
        console.error('Error validando logro:', error.message);
        res.status(404).send("<h3>Error de Validación</h3><p>El certificado o logro no pudo ser validado en los registros oficiales de la FDFF.</p>");
    }
};

const verHistorico = async (req, res) => {
    try {
        const { data: eventosPasados, error } = await supabase
            .from('eventos')
            .select('*')
            .eq('estado', 'finalizado')
            .order('fecha_inicio', { ascending: false });

        if (error) throw error;
        res.render('eventos/historico_lista', { eventos: eventosPasados || [] });
    } catch (error) {
        console.error('🔥 Error en histórico:', error.message);
        res.redirect('/eventos/competencias');
    }
};

const verResultadosPublicos = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error: errEv } = await supabaseAdmin.from('eventos').select('*').eq('id', id).single();
        if (errEv || !evento) return res.redirect('/eventos');

        const { data: relaciones } = await supabaseAdmin
            .from('eventos_categorias')
            .select(`
                id,
                categorias ( nombre ),
                competidores ( numero_atleta, posicion_final, atletas ( nombre, gimnasio ) )
            `)
            .eq('evento_id', id)
            .order('orden_secuencia_categoria', { ascending: true });

        const categorias = (relaciones || []).map(rel => ({
            nombre_categoria: rel.categorias?.nombre,
            atletas: (rel.competidores || [])
                .filter(c => c.posicion_final)
                .sort((a, b) => a.posicion_final - b.posicion_final)
                .map(a => ({
                    posicion: a.posicion_final,
                    nombre: a.atletas?.nombre,
                    dorsal: a.numero_atleta,
                    team: a.atletas?.gimnasio || 'Independiente'
                }))
        }));

        // Lógica de Ranking de Equipos (basada en verReporteOficial)
        const { data: participaciones } = await supabaseAdmin
            .from('competidores')
            .select('posicion_final, es_ganador_absoluto, atletas(preparadores(nombre_completo))')
            .eq('id_evento', id)
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

        res.render('eventos/resultados_publicos', { 
            evento, 
            categorias, 
            rankingTeams 
        });
    } catch (error) {
        console.error('🔥 Error en resultados públicos:', error.message);
        res.redirect('/eventos/historico');
    }
};

const crearNuevoEvento = async (req, res) => {
    const { 
        NombreEvento, Fecha, Lugar, direccion, fecha_pesaje, lugar_pesaje, direccion_pesaje, 
        costo_primera, costo_adicional, info_pesaje, Categorias,
        fecha_limite_oferta, costo_oferta_primera, costo_oferta_adicional
    } = req.body;
    
    try {
        // Validación de entrada
        const validacion = nuevoEventoSchema.safeParse(req.body);
        if (!validacion.success) {
            throw new Error(validacion.error.errors.map(e => e.message).join(". "));
        }

        let bannerEventoUrl = null;
        let bannerPesajeUrl = null;

        // 1. Procesar los Banners si existen
        if (req.files && req.files['banner_evento']) {
            bannerEventoUrl = await subirAStorage(req.files['banner_evento'][0], 'eventos-banners', 'banners');
        }
        if (req.files && req.files['banner_pesaje']) {
            bannerPesajeUrl = await subirAStorage(req.files['banner_pesaje'][0], 'eventos-banners', 'afiches_pesaje');
        }

        // 2. Crear el Evento
        const { data: nuevoEv, error: evError } = await supabaseAdmin
            .from('eventos')
            .insert([{
                nombre: NombreEvento,
                fecha_inicio: Fecha,
                lugar: Lugar,
                direccion,
                fecha_pesaje,
                lugar_pesaje,
                direccion_pesaje,
                costo_primera_cat: parseFloat(costo_primera) || 0,
                costo_adicional: parseFloat(costo_adicional) || 0,
                fecha_limite_oferta: fecha_limite_oferta || null,
                costo_oferta_primera: parseFloat(costo_oferta_primera) || 0,
                costo_oferta_adicional: parseFloat(costo_oferta_adicional) || 0,
                banner_url: bannerEventoUrl, // Promotional banner
                afiche_pesaje_url: bannerPesajeUrl, // Technical pesaje banner
                info_pesaje: info_pesaje, // Pesaje description
                estado: 'inscripcion'
            }])
            .select()
            .single();

        if (evError) throw evError;

        // 3. Vincular Categorías (If Categorias is an array of IDs)
        if (Categorias && Array.isArray(Categorias)) {
            const vinculos = Categorias.map(catId => ({
                evento_id: nuevoEv.id,
                categoria_id: catId,
                orden_secuencia_categoria: 0 // Default order, can be updated later
            }));

            const { error: errVin } = await supabaseAdmin
                .from('eventos_categorias')
                .insert(vinculos);

            if (errVin) console.error('Error vinculando categorías:', errVin.message);
        } else if (Categorias) { // Handle single category case if not an array
             const vinculos = [{
                evento_id: nuevoEv.id,
                categoria_id: Categorias,
                orden_secuencia_categoria: 0
            }];
            const { error: errVin } = await supabaseAdmin
                .from('eventos_categorias')
                .insert(vinculos);
            if (errVin) console.error('Error vinculando categoría única:', errVin.message);
        }


        // 4. ENVÍO DE NOTIFICACIÓN PUSH
        if (webpush.VAPIDDetails) { // Only send if VAPID is configured
            const payload = JSON.stringify({
                title: '📢 NOTICIA OFICIAL FDFF',
                body: `Nuevo Evento: ${NombreEvento}. ¡Revisa los detalles de pesaje!`,
                image: bannerEventoUrl || '/img/default-event.jpg',
                url: `${req.protocol}://${req.get('host')}/eventos/historico`
            });

            const { data: suscripciones } = await supabaseAdmin.from('notificaciones_suscripciones').select('subscription_json');
            
            if (suscripciones && suscripciones.length > 0) {
                suscripciones.forEach(s => {
                    webpush.sendNotification(JSON.parse(s.subscription_json), payload)
                        .catch(err => console.error("Error enviando push a suscripción:", err.message, s.subscription_json));
                });
            }
        }

        res.redirect(`/eventos/${nuevoEv.id}`);
    } catch (error) {
        console.error('🔥 Error creando evento:', error.message);
        // Need to fetch categories again for rendering the form
        const { data: arrayCategorias, error: catError } = await supabaseAdmin
            .from('categorias')
            .select('*')
            .order('nombre', { ascending: true });

        res.render('nuevoEvento', { 
            error: true, 
            mensaje: 'Fallo al crear el evento: ' + error.message,
            arrayCategorias: arrayCategorias || [],
            evento: null // No event data on error
        });
    }
};

const actualizarEvento = async (req, res) => {
    const { id } = req.params;
    const { 
        NombreEvento, Fecha, Lugar, direccion, info_pesaje, costo_primera, costo_adicional, estado,
        fecha_limite_oferta, costo_oferta_primera, costo_oferta_adicional
    } = req.body;

    try {
        let bannerUrl = null;

        // 1. Procesar el Banner si se adjunta uno nuevo (Multer + Supabase Storage)
        if (req.file) {
            const fileName = `${Date.now()}_banner_${id}.jpg`;
            const { error: uploadError } = await supabaseAdmin.storage
                .from('eventos-banners')
                .upload(`banners/${fileName}`, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseAdmin.storage
                .from('eventos-banners')
                .getPublicUrl(`banners/${fileName}`);
            
            bannerUrl = urlData.publicUrl;
        }

        // 2. Preparar objeto de actualización
        const updateData = {
            nombre: NombreEvento,
            fecha_inicio: Fecha,
            lugar: Lugar,
            direccion,
            info_pesaje,
            costo_primera_cat: parseFloat(costo_primera) || 0,
            costo_adicional: parseFloat(costo_adicional) || 0,
            estado,
            fecha_limite_oferta: fecha_limite_oferta || null,
            costo_oferta_primera: parseFloat(costo_oferta_primera) || 0,
            costo_oferta_adicional: parseFloat(costo_oferta_adicional) || 0,
        };

        if (bannerUrl) updateData.banner_url = bannerUrl;

        const { error } = await supabaseAdmin
            .from('eventos')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        res.redirect(`/eventos/${id}/centro-mando`);
    } catch (error) {
        console.error('🔥 Error actualizando evento:', error.message);
        res.status(500).send('Error al actualizar el evento: ' + error.message);
    }
};

const verAuditoriaRecaudacion = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error: errEv } = await supabaseAdmin.from('eventos').select('*').eq('id', id).single();
        if (errEv || !evento) return res.redirect('/eventos');

        // Buscamos todos los competidores con sus datos de atleta
        const { data: competidores, error: errComp } = await supabaseAdmin
            .from('competidores')
            .select(`
                id,
                atleta_id,
                created_at,
                atletas!inner (
                    nombre,
                    cedula,
                    estatus_afiliacion,
                    idfdff
                )
            `)
            .eq('id_evento', id);

        if (errComp) throw errComp;

        // Agrupamos por atleta para calcular el cobro (1ra cat + adicionales)
        const desglose = {};
        (competidores || []).forEach(c => {
            const uid = c.atleta_id;
            if (!desglose[uid]) {
                desglose[uid] = {
                    nombre: c.atletas?.nombre || 'N/A',
                    cedula: c.atletas?.cedula || 'N/A',
                    cant: 0,
                    monto: 0,
                    fecha_registro: c.created_at,
                    estatus_afiliacion: c.atletas?.estatus_afiliacion // FIX: Se requiere para el cálculo posterior
                };
            }
            desglose[uid].cant++;
        });

        let totalInscripciones = 0;
        const listaFinal = Object.values(desglose).map(item => {
            // Lógica Early Bird: Comparamos fecha de registro con límite de oferta
            const fechaReg = new Date(item.fecha_registro);
            const fechaLim = evento.fecha_limite_oferta ? new Date(evento.fecha_limite_oferta) : null;
            const esOferta = fechaLim && fechaReg <= fechaLim;

            const p1 = esOferta ? (evento.costo_oferta_primera || evento.costo_primera_cat) : (evento.costo_primera_cat || 0);
            const pA = esOferta ? (evento.costo_oferta_adicional || evento.costo_adicional) : (evento.costo_adicional || 0);

            const costoInscripcion = p1 + ((item.cant - 1) * pA);
            const costoMembresia = (item.estatus_afiliacion === 'pendiente') ? 1500 : 0; // Ejemplo: 1500 membresía
            
            item.monto = costoInscripcion + costoMembresia;
            totalInscripciones += item.monto;
            return item;
        });

        // 2. Traer Ingresos Extras (Patrocinios, Tickets, etc.)
        const { data: extras } = await supabaseAdmin
            .from('evento_ingresos_extra')
            .select('monto')
            .eq('evento_id', id);
        
        const totalExtra = (extras || []).reduce((acc, e) => acc + parseFloat(e.monto || 0), 0);

        // 3. Traer Gastos Operativos
        const { data: gastos } = await supabaseAdmin
            .from('evento_gastos')
            .select('monto')
            .eq('evento_id', id);

        const totalGastos = (gastos || []).reduce((acc, g) => acc + parseFloat(g.monto || 0), 0);

        res.render('eventos/recaudacion', { 
            evento, 
            recaudacion: listaFinal, 
            totalInscripciones,
            totalExtra,
            totalGastos
        });
    } catch (error) {
        console.error("❌ Error en Auditoría de Recaudación:", error.message);
        res.status(500).send("Error en recaudación: " + error.message);
    }
};

const registrarIngresoExtra = async (req, res) => {
    const { evento_id, concepto, monto } = req.body;
    try {
        await supabaseAdmin.from('evento_ingresos_extra').insert([{ evento_id, concepto, monto: parseFloat(monto) }]);
        res.redirect(`/eventos/${evento_id}/recaudacion`);
    } catch (e) { res.status(500).send(e.message); }
};

const registrarGastoOperativo = async (req, res) => {
    const { evento_id, concepto, monto } = req.body;
    try {
        let reciboUrl = null;
        if (req.file) {
            // Utilizamos el helper subirAStorage ya definido en el controlador
            reciboUrl = await subirAStorage(req.file, 'eventos-banners', 'recibos_gastos');
        }

        await supabaseAdmin.from('evento_gastos').insert([{ 
            evento_id, 
            concepto, 
            monto: parseFloat(monto),
            recibo_url: reciboUrl // Asegúrate de tener esta columna en tu tabla de Supabase
        }]);

        res.redirect(`/eventos/${evento_id}/recaudacion`);
    } catch (e) { res.status(500).send(e.message); }
};

const verBackstageSeguridad = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error } = await supabaseAdmin.from('eventos').select('*').eq('id', id).single();
        if (error || !evento) throw new Error("Evento no encontrado para Portería");
        res.render('eventos/scanner', { evento });
    } catch (e) {
        console.error("❌ Error en Portería:", e.message);
        res.status(404).send("Error: " + e.message);
    }
};

const verDJConsola = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error } = await supabaseAdmin.from('eventos').select('*').eq('id', id).single();
        if (error || !evento) throw new Error("Evento no encontrado para Consola DJ");

        // Traer competidores aprobados con su música
        const { data: competidores } = await supabaseAdmin
            .from('competidores')
            .select(`
                id,
                numero_atleta,
                musica_url,
                atletas ( nombre ),
                eventos_categorias (
                    categorias ( nombre )
                )
            `)
            .eq('id_evento', id)
            .eq('estatus_pesaje', 'aprobado')
            .order('numero_atleta', { ascending: true });

        res.render('eventos/dj_consola', { evento, competidores: competidores || [], user: res.locals.user });
    } catch (e) {
        console.error("❌ Error 500 en Consola DJ:", e.message);
        res.status(500).send("Error Interno en Consola DJ: " + e.message);
    }
};

const verBroadcastLive = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: evento, error } = await supabaseAdmin.from('eventos').select('*').eq('id', id).single();
        if (error || !evento) throw new Error("Evento no encontrado para Broadcast");
        
        // Obtener categorías activas para el panel de video
        const { data: cats } = await supabaseAdmin
            .from('eventos_categorias')
            .select('*, categorias(nombre)')
            .eq('evento_id', id)
            .in('estatus_logistica', ['abierta activa', 'abierta exhibicion', 'exhibicion']);

        res.render('eventos/broadcast_live', { evento, categoriasActivas: cats || [] });
    } catch (e) {
        console.error("❌ Error en Broadcast:", e.message);
        res.status(500).send("Error en Broadcast: " + e.message);
    }
};

module.exports = {
    listarEventos,
    prepararEventoPage,
    oficializarPreparacion,
    verMonitorMC,
    inyectarJuecesMC,
    verBoletaJuez,
    verReporteOficial,
    verDashboardEvento,
    verDiplomaAtleta,
    verBackstage,
    verCentroMando,
    verCertificadoOficial,
    validarLogroPublico,
    verHistorico,
    verResultadosPublicos,
    crearNuevoEvento,
    actualizarEvento,
    verAuditoriaRecaudacion,
    verBackstageSeguridad,
    verDJConsola,
    verBroadcastLive,
    registrarIngresoExtra,
    registrarGastoOperativo
};
