const { supabase, supabaseAdmin } = require('../config/supabase');
const QRCode = require('qrcode');

const listarAtletas = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('atletas')
            .select('*')
            .order('estatus_afiliacion', { ascending: false }) // 'pendiente' (p) aparecerá antes que 'habilitado' (h)
            .order('nombre', { ascending: true });

        if (error) throw error;

        res.render('atletas', { arrayAtletas: data || [] });
    } catch (error) {
        console.error('Error al listar atletas:', error.message);
        res.render('atletas', { arrayAtletas: [] });
    }
};

const mostrarFormularioCrear = (req, res) => {
    res.render('crear');
};

const crearAtleta = async (req, res) => {
    const {
        email,
        password,
        nombre,
        cedula,
        idfdff,
        pasaporte,
        nacionalidad,
        fecha_nacimiento,
        sexo,
        ocupacion,
        calle,
        sector,
        municipio,
        provincia,
        pais,
        postal,
        celular,
        telfijo,
        instagram,
        gimnasio,
        celular_preparador,
        preparador,
        email_preparador,
        categoria,
        peso,
        estatura
    } = req.body;

    try {
        console.log("📩 Intento de creación de atleta recibido para:", email);

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) throw new Error('Error en Auth: ' + authError.message);

        const newUserId = authData.user.id;
        console.log("✅ Usuario creado en Supabase Auth con ID:", newUserId);


        // 2. Crear Perfil (Upsert evita errores si un trigger ya creó el registro)
        const { error: errorProfile } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: newUserId, nombre, role: 'atleta', cedula, email, id_fdff: idfdff || null }, { onConflict: 'id' });

        if (errorProfile) throw new Error('Error en Profile: ' + errorProfile.message);

        // 3. Crear registro en tabla Atletas
        const { error: errorAtleta } = await supabaseAdmin
            .from('atletas')
            .insert([{
                id: newUserId,
                nombre,
                email,
                cedula: cedula || null,
                idfdff: idfdff || null,
                estatus_afiliacion: 'habilitado',
                fecha_ultima_renovacion: `${new Date().getFullYear()}-12-31`,
                pasaporte,
                nacionalidad,
                fecha_nacimiento,
                sexo,
                ocupacion,
                calle,
                sector,
                municipio,
                provincia,
                pais,
                postal,
                celular,
                telfijo,
                instagram,
                gimnasio,
                preparador,
                celular_preparador,
                email_preparador,
                categoria,
                estatura: (estatura && !isNaN(parseFloat(estatura))) ? parseFloat(estatura) : null,
                peso: (peso && !isNaN(parseFloat(peso))) ? parseFloat(peso) : null
            }]);

        if (errorAtleta) throw new Error('Error en Atletas: ' + errorAtleta.message);

        res.json({ estado: true, mensaje: 'Atleta creado y guardado con éxito.' });
    } catch (error) {
        console.error('🔥 Error en crearAtleta:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const detalleAtleta = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('atletas')
            .select('*, preparadores(id, nombre_completo, gimnasio_labora)')
            .eq('id', id)
            .single();

        if (error || !data) throw error || new Error('Atleta no encontrado');

        const { data: historial } = await supabaseAdmin
            .from('competidores')
            .select(`
                id,
                numero_atleta,
                posicion_final,
                pago_validado,
                estatus_pesaje,
                eventos ( id, nombre, fecha_inicio, estado ),
                eventos_categorias ( categorias ( nombre ) )
            `)
            .eq('atleta_id', id)
            .order('created_at', { ascending: false });

        res.render('detalle', { atleta: data, historial: historial || [], error: false });
    } catch (error) {
        console.error('Error al obtener atleta:', error.message);
        res.render('detalle', { error: true, mensaje: 'No encontrado' });
    }
};

const eliminarAtleta = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Borrar de Supabase Auth (Limpia el acceso al sistema)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) console.warn("Aviso: El usuario no existía en Auth o no pudo ser borrado:", authError.message);

        // 2. Borrar de la tabla Atletas
        const { error } = await supabaseAdmin
            .from('atletas')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ estado: true, mensaje: 'Eliminado!' });
    } catch (error) {
        console.error('Error al eliminar atleta:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const actualizarAtleta = async (req, res) => {
    const { id } = req.params;
    const datosRecibidos = { ...req.body };

    delete datosRecibidos.role;
    delete datosRecibidos.id;

    try {
        const { error } = await supabaseAdmin
            .from('atletas')
            .update(datosRecibidos)
            .eq('id', id);

        if (error) throw error;

        res.json({ estado: true, mensaje: 'Atleta actualizado con éxito' });
    } catch (error) {
        console.error('Error en PUT atleta:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const solicitarAfiliacion = async (req, res) => {
    const usuarioId = res.locals.user?.id;
    console.log("📩 Solicitud de afiliación recibida para usuario ID:", usuarioId);
    if (!usuarioId) return res.status(401).json({ estado: false, mensaje: "Sesión expirada" });

    try {
        const { error } = await supabaseAdmin
            .from('atletas')
            .upsert({ ...req.body, id: usuarioId });

        if (error) throw error;

        // Asignamos el rol de 'atleta' al usuario en el momento que envía su solicitud
         // Sincronizamos el NOMBRE y el ROL en la tabla de perfiles
        await supabaseAdmin.from('profiles').update({ 
            nombre: req.body.nombre,
            email: req.body.email,
            role: 'atleta' 
        }).eq('id', usuarioId);

        res.json({ estado: true, mensaje: "Solicitud enviada correctamente" });
    } catch (error) {
        console.error("🔥 Error en solicitarAfiliacion:", error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const validarAfiliacion = async (req, res) => {
    const { atletaId, estaActivo } = req.body;
    if (!atletaId) return res.status(400).json({ estado: false, mensaje: "ID requerido" });

    const nuevoEstatus = estaActivo ? 'habilitado' : 'deshabilitado';
    const fechaRenovacion = estaActivo ? new Date().getFullYear() + "-12-31" : null;

    try {
        // 1. Actualizar estatus en tabla atletas
        const { error: errAtleta } = await supabaseAdmin
            .from('atletas')
            .update({ 
                estatus_afiliacion: nuevoEstatus,
                fecha_ultima_renovacion: fechaRenovacion 
            })
            .eq('id', atletaId);

        if (errAtleta) throw errAtleta;

        // Nota: El rol ya fue asignado durante la solicitud de afiliación web
        // o durante la creación manual por el administrador.
        res.json({ estado: true, mensaje: `Atleta ${nuevoEstatus} correctamente.` });
    } catch (error) {
        console.error("🔥 Error validando afiliación:", error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const actualizarFotoPerfil = async (req, res) => {
    const usuarioId = res.locals.user?.id;
    if (!usuarioId) return res.status(401).json({ estado: false, mensaje: "Sesión expirada" });

    try {
        if (!req.file) throw new Error("Debe seleccionar una imagen.");

        const file = req.file;
        const filePath = `${usuarioId}/perfil_oficial.jpg`;

        // Subida al Storage usando supabaseAdmin (ignora RLS y evita error de tabla users)
        const { error: uploadError } = await supabaseAdmin.storage
            .from('fotos_perfil')
            .upload(filePath, file.buffer, { 
                contentType: file.mimetype,
                upsert: true 
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseAdmin.storage.from('fotos_perfil').getPublicUrl(filePath);
        const urlFinal = `${urlData.publicUrl}?t=${Date.now()}`;

        // Actualizar la tabla atletas
        const { error: dbError } = await supabaseAdmin.from('atletas')
            .update({ foto_url: urlFinal })
            .eq('id', usuarioId);

        if (dbError) throw dbError;

        res.json({ estado: true, mensaje: "Foto de perfil actualizada correctamente.", url: urlFinal });
    } catch (error) {
        console.error("🔥 Error actualizando foto perfil:", error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const verPerfilPropio = async (req, res) => {
    const usuarioId = res.locals.user?.id;
    if (!usuarioId) return res.redirect('/login');

    try {
        // 1. Obtener la ficha técnica del atleta y su preparador actual
        const { data: atleta } = await supabase
            .from('atletas')
            .select(`
                *,
                preparadores ( id, nombre_completo, gimnasio_labora )
            `)
            .eq('id', usuarioId)
            .single();

        // 2. Traer todos los preparadores habilitados para el selector de cambio
        const { data: preparadores } = await supabase
            .from('preparadores')
            .select('id, nombre_completo, gimnasio_labora')
            .eq('estatus_afiliacion', 'habilitado')
            .order('nombre_completo', { ascending: true });

        // 3. Buscar el historial de eventos y categorías donde ha participado
        const { data: historial } = await supabase
            .from('competidores')
            .select(`
                id,
                numero_atleta,
                posicion_final,
                pago_validado,
                url_comprobante_pago,
                musica_url,
                eventos ( id, nombre, fecha_inicio, estado ),
                eventos_categorias ( categorias ( nombre ) )
            `)
            .eq('atleta_id', usuarioId)
            .order('created_at', { ascending: false });

        // 4. Traer publicaciones (estilo Facebook)
        const { data: publicaciones } = await supabaseAdmin
            .from('publicaciones_muro')
            .select(`
                *,
                profiles!atleta_id (nombre),
                atletas!atleta_id ( nombre, foto_url ),
                imagen_url:foto_url,
                publicacion_comentarios!publicacion_id (
                    *,
                    profiles ( nombre ),
                    atletas!user_id ( nombre )
                ),
                publicacion_likes!publicacion_id ( user_id )
            `)
            .eq('atleta_id', usuarioId)
            .order('fecha_publicacion', { ascending: false });

        const postsConLikes = (publicaciones || []).map(p => ({
            ...p,
            likesCount: p.publicacion_likes?.length || 0,
            userLiked: p.publicacion_likes?.some(l => l.user_id === usuarioId)
        }));

        // 5. Identificar el evento activo actual para inscripciones
        const { data: currentEvent } = await supabase
            .from('eventos')
            .select('*')
            .or('estado.eq.inscripcion,estado.eq.pesaje')
            .order('fecha_inicio', { ascending: false })
            .limit(1)
            .single();

        let enrollmentData = null;
        if (currentEvent) {
            // 6. Verificar si el atleta tiene una inscripción activa para este evento
            const { data: participations } = await supabase
                .from('competidores')
                .select('id, url_comprobante_pago, pago_validado, fecha_subida_pago, observaciones_pago, created_at, musica_url')
                .eq('atleta_id', usuarioId)
                .eq('id_evento', currentEvent.id);

            if (participations && participations.length > 0) {
                // Lógica de cálculo considerando oferta basada en la fecha de creación del registro
                const fechaReg = new Date(participations[0].created_at);
                const fechaLim = currentEvent.fecha_limite_oferta ? new Date(currentEvent.fecha_limite_oferta) : null;
                const esOferta = fechaLim && fechaReg <= fechaLim;

                const p1 = esOferta ? (currentEvent.costo_oferta_primera || currentEvent.costo_primera_cat) : (currentEvent.costo_primera_cat || 0);
                const pA = esOferta ? (currentEvent.costo_oferta_adicional || currentEvent.costo_adicional) : (currentEvent.costo_adicional || 0);

                const cant = participations.length;
                const monto_total = p1 + (cant - 1) * pA;
                
                enrollmentData = {
                    id: participations[0].id,
                    url_comprobante_pago: participations.find(p => p.url_comprobante_pago)?.url_comprobante_pago || null,
                    pago_validado: participations.every(p => p.pago_validado),
                    fecha_subida_pago: participations.find(p => p.fecha_subida_pago)?.fecha_subida_pago || null,
                    monto_total: monto_total,
                    observaciones_pago: participations.find(p => p.observaciones_pago)?.observaciones_pago || null,
                    musica_url: participations.find(p => p.musica_url)?.musica_url || null
                };
            }
        }

        res.render('atleta_vistas/perfil', {
            atleta: atleta || {},
            preparadores: preparadores || [],
            historial: historial || [],
            publicaciones: postsConLikes,
            user: res.locals.user,
            evento: currentEvent,
            inscripcion: enrollmentData
        });
    } catch (error) {
        console.error("🔥 Error cargando perfil de atleta:", error.message);
        res.status(500).send("Error interno al cargar el perfil.");
    }
};

const actualizarTeamPropio = async (req, res) => {
    const usuarioId = res.locals.user?.id;
    if (!usuarioId) return res.status(401).json({ estado: false });
    
    const { preparador_id } = req.body;

    try {
        const { error } = await supabase
            .from('atletas')
            .update({ preparador_id: preparador_id || null })
            .eq('id', usuarioId);

        if (error) throw error;
        res.json({ estado: true, mensaje: "¡Team / Preparador actualizado con éxito!" });
    } catch (error) {
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const darLikePublicacion = async (req, res) => {
    const usuarioId = res.locals.user?.id;
    const { publicacion_id } = req.body;
    if (!usuarioId) return res.status(401).json({ estado: false, mensaje: "Inicia sesión" });

    try {
        const { data: existingLike } = await supabase
            .from('publicacion_likes')
            .select('*')
            .eq('publicacion_id', publicacion_id)
            .eq('user_id', usuarioId)
            .single();

        if (existingLike) {
            await supabase.from('publicacion_likes').delete().eq('id', existingLike.id);
            res.json({ estado: true, operacion: 'quitar' });
        } else {
            await supabase.from('publicacion_likes').insert({ publicacion_id, user_id: usuarioId });
            res.json({ estado: true, operacion: 'dar' });
        }
    } catch (error) {
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const subirPublicacion = async (req, res) => {
    const user = res.locals.user;
    const usuarioId = user?.id;
    const { descripcion } = req.body;

    if (!user || user.role === 'general')
        return res.status(403).send("Tu rol no permite publicar en el muro.");

    try {
        if (!req.file) throw new Error("Debe seleccionar una imagen.");

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${usuarioId}.${fileExt}`;
        const filePath = `social/${fileName}`;

        // Usamos el bucket 'muro_social' y el cliente admin para evitar errores de permisos
        const { error: uploadError } = await supabaseAdmin.storage
            .from('muro_social')
            .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseAdmin.storage.from('muro_social').getPublicUrl(filePath);

        const { error: dbError } = await supabaseAdmin
            .from('publicaciones_muro')
            .insert({
                atleta_id: usuarioId,
                foto_url: urlData.publicUrl,
                descripcion
            });

        if (dbError) throw dbError;

        const referer = req.get('Referer') || '';
        const destino = referer.includes('/social/muro') ? '/social/muro' : '/atletas/perfil';
        res.redirect(destino);
    } catch (error) {
        console.error("🔥 Error subiendo publicación:", error.message);
        res.status(500).send("Error al subir la publicación: " + error.message);
    }
};

const comentarPublicacion = async (req, res) => {
    const user = res.locals.user;
    const usuarioId = user?.id;
    const { publicacion_id, comentario } = req.body;

    if (!user || user.role === 'general')
        return res.status(403).json({ estado: false, mensaje: "Tu rol no permite comentar." });

    try {
        const { error } = await supabaseAdmin
            .from('publicacion_comentarios')
            .insert({
                publicacion_id,
                user_id: usuarioId,
                comentario
            });

        if (error) throw error;
        res.json({ estado: true });
    } catch (error) {
        console.error("🔥 Error comentando:", error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

const verComprobanteInscripcion = async (req, res) => {
    const { idEvento } = req.params;
    const atletaId = res.locals.user?.id;

    if (!atletaId) return res.redirect('/login');

    try {
        // 1. Buscamos datos del atleta, su estatus de afiliación y su preparador
        const { data: atleta } = await supabase
            .from('atletas')
            .select('*, preparadores(nombre_completo)')
            .eq('id', atletaId)
            .single();

        // 2. Buscamos las categorías donde se inscribió en ESTE evento
        const { data: inscripciones } = await supabase
            .from('competidores')
            .select('eventos_categorias(categorias(nombre)), id_evento, estatus_pesaje, created_at')
            .eq('atleta_id', atletaId)
            .eq('id_evento', idEvento);

        // 3. Info del evento para sacar los precios
        const { data: evento } = await supabase
            .from('eventos').select('*').eq('id', idEvento).single();

        if (!evento) throw new Error("Evento no encontrado.");

        // 4. Cálculo de Monto considerando oferta en el Comprobante
        const fechaReg = inscripciones && inscripciones.length > 0 ? new Date(inscripciones[0].created_at) : new Date();
        const fechaLim = evento.fecha_limite_oferta ? new Date(evento.fecha_limite_oferta) : null;
        const esOferta = fechaLim && fechaReg <= fechaLim;

        const p1 = esOferta ? (evento.costo_oferta_primera || evento.costo_primera_cat) : (evento.costo_primera_cat || 0);
        const pA = esOferta ? (evento.costo_oferta_adicional || evento.costo_adicional) : (evento.costo_adicional || 0);

        const cant = (inscripciones || []).length;
        const totalPagado = cant > 0 ? (p1 + (cant - 1) * pA) : 0;

        // 5. Generar Código QR para validación instantánea en Mesa Técnica
        // Apuntamos a la ruta de detalle de inscripción que ya tienes definida
        const qrUrl = `${req.protocol}://${req.get('host')}/inscripcion/${atletaId}`;
        const qrCodeData = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'H', margin: 1 });

        res.render('atleta_vistas/comprobante_pdf', {
            atleta: atleta || {},
            inscripciones: inscripciones || [],
            evento,
            totalPagado,
            qrCodeData,
            fecha: new Date().toLocaleDateString('es-DO')
        });
    } catch (e) {
        console.error("🔥 Error al generar comprobante:", e.message);
        res.redirect('/atletas/perfil');
    }
};

const verUploadFotografo = async (req, res) => {
    try {
        const { evento_id } = req.query;

        const { data: eventos, error } = await supabase
            .from('eventos')
            .select('id, nombre')
            .order('fecha_inicio', { ascending: false });

        if (error) throw error;

        let competidores = [];
        let eventoSeleccionado = null;

        if (evento_id) {
            const [{ data: ev }, { data: comps }] = await Promise.all([
                supabaseAdmin.from('eventos').select('id, nombre').eq('id', evento_id).single(),
                supabaseAdmin.from('competidores')
                    .select('id, numero_atleta, foto_atletica_url, atletas(nombre, foto_url)')
                    .eq('id_evento', evento_id)
                    .eq('estatus_pesaje', 'aprobado')
                    .order('numero_atleta', { ascending: true })
            ]);
            eventoSeleccionado = ev || null;
            competidores = comps || [];
        }

        res.render('fotografo/upload', {
            eventosActivos: eventos || [],
            competidores,
            eventoSeleccionado,
            evento_id: evento_id || ''
        });
    } catch (error) {
        console.error('🔥 Error panel fotógrafo:', error.message);
        res.redirect('/eventos/competencias');
    }
};

const subirFotoAtletica = async (req, res) => {
    const { competidor_id, foto_url } = req.body;
    if (!competidor_id || !foto_url) return res.status(400).json({ ok: false, mensaje: 'Datos incompletos' });
    try {
        const { error } = await supabaseAdmin
            .from('competidores')
            .update({ foto_atletica_url: foto_url })
            .eq('id', competidor_id);
        if (error) throw error;
        res.json({ ok: true });
    } catch (err) {
        console.error('🔥 Error subirFotoAtletica:', err.message);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const verEntradaAtleta = async (req, res) => {
    const { idEvento, idAtleta } = req.params;
    try {
        // Usamos supabaseAdmin para garantizar que la pantalla LED siempre tenga acceso a los datos
        const { data: competidor, error } = await supabaseAdmin
            .from('competidores')
            .select(`
                numero_atleta,
                foto_atletica_url,
                atletas ( nombre, provincia, preparador, peso, estatura, fecha_nacimiento ),
                eventos_categorias (
                    categorias ( nombre )
                )
            `)
            .eq('id_evento', idEvento)
            .eq('atleta_id', idAtleta)
            .single();

        if (error || !competidor) throw error || new Error('Registro de competidor no encontrado');

        const atl = competidor.atletas;
        if (!atl) throw new Error('El competidor no tiene un perfil de atleta vinculado.');

        const edad = atl.fecha_nacimiento ? new Date().getFullYear() - new Date(atl.fecha_nacimiento).getFullYear() : '--';

        res.render('eventos/broadcast/entrada_atleta', {
            atleta: {
                nombre: atl.nombre,
                provincia: atl.provincia || 'N/A',
                preparador: atl.preparador || 'Independiente',
                dorsal: competidor.numero_atleta || '00',
                peso: atl.peso || '--',
                estatura: atl.estatura || '--',
                edad: edad,
                foto_atletica_url: competidor.foto_atletica_url,
                categoria: competidor.eventos_categorias?.categorias?.nombre || 'Categoría Oficial'
            },
            eventoId: idEvento
        });
    } catch (error) {
        console.error('🔥 Error en pantalla LED:', error.message);
        res.status(500).send('Error al cargar la pantalla LED');
    }
};

const subirMusicaCompetidor = async (req, res) => {
    const usuarioId = res.locals.user?.id;
    if (!usuarioId) return res.status(401).json({ estado: false, mensaje: 'Sesión expirada' });

    const { id_evento } = req.body;
    if (!id_evento) return res.status(400).json({ estado: false, mensaje: 'Evento no especificado' });

    try {
        if (!req.file) throw new Error('Debes seleccionar un archivo de audio.');

        const file = req.file;
        const ext = (file.originalname.split('.').pop() || 'mp3').toLowerCase();
        const allowed = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
        if (!allowed.includes(ext)) throw new Error('Formato no permitido. Usa MP3, WAV o M4A.');

        const filePath = `${usuarioId}/${id_evento}/musica.${ext}`;

        // Crear bucket si no existe
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExiste = buckets && buckets.some(b => b.name === 'musica_atletas');
        if (!bucketExiste) {
            const { error: bucketErr } = await supabaseAdmin.storage.createBucket('musica_atletas', { public: true, fileSizeLimit: 20971520 });
            if (bucketErr) throw new Error('No se pudo crear el bucket de música: ' + bucketErr.message);
        }

        const { error: uploadError } = await supabaseAdmin.storage
            .from('musica_atletas')
            .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseAdmin.storage.from('musica_atletas').getPublicUrl(filePath);
        const urlMusica = `${urlData.publicUrl}?t=${Date.now()}`;

        const { data: rowsActualizados, error: dbError } = await supabaseAdmin
            .from('competidores')
            .update({ musica_url: urlMusica })
            .eq('atleta_id', usuarioId)
            .eq('id_evento', id_evento)
            .select('id');

        if (dbError) throw dbError;

        if (!rowsActualizados || rowsActualizados.length === 0) {
            return res.status(400).json({ estado: false, mensaje: 'Debes inscribirte en el evento primero para poder subir tu música.' });
        }

        res.json({ estado: true, mensaje: 'Música subida con éxito. El DJ ya tiene tu canción.', url: urlMusica });
    } catch (error) {
        console.error('Error subiendo música del atleta:', error.message);
        res.status(500).json({ estado: false, mensaje: error.message });
    }
};

module.exports = {
    listarAtletas,
    mostrarFormularioCrear,
    crearAtleta,
    detalleAtleta,
    eliminarAtleta,
    actualizarAtleta,
    verPerfilPropio,
    actualizarTeamPropio,
    validarAfiliacion,
    solicitarAfiliacion,
    subirPublicacion,
    darLikePublicacion,
    actualizarFotoPerfil,
    comentarPublicacion,
    verComprobanteInscripcion,
    verUploadFotografo,
    subirFotoAtletica,
    verEntradaAtleta,
    subirMusicaCompetidor
};
