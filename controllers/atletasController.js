const { supabase, supabaseAdmin } = require('../supabaseClient');
const QRCode = require('qrcode');

const listarAtletas = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('atletas')
            .select('*')
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
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) throw new Error('Error en Auth: ' + authError.message);

        const newUserId = authData.user.id;

        const { error: errorProfile } = await supabase
            .from('profiles')
            .insert([{ id: newUserId, nombre, role: 'atleta', cedula, email, id_fdff: idfdff }]);

        if (errorProfile) throw new Error('Error en Profile: ' + errorProfile.message);

        const { error: errorAtleta } = await supabase
            .from('atletas')
            .insert([{
                id: newUserId,
                nombre,
                cedula,
                idfdff,
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
                estatura,
                peso
            }]);

        if (errorAtleta) throw new Error('Error en Atletas: ' + errorAtleta.message);

        res.redirect('/inscripcion/pesaje');
    } catch (error) {
        console.error('🔥 Error detectado:', error.message);
        res.status(500).send(`<h3>Error al procesar:</h3><p>${error.message}</p><a href='/atletas/crear'>Volver a intentar</a>`);
    }
};

const detalleAtleta = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('atletas')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) throw error || new Error('Atleta no encontrado');

        res.render('detalle', { atleta: data, error: false });
    } catch (error) {
        console.error('Error al obtener atleta:', error.message);
        res.render('detalle', {
            error: true,
            mensaje: 'No encontrado'
        });
    }
};

const eliminarAtleta = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
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
    delete datosRecibidos.email;

    try {
        const { error } = await supabase
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
                eventos ( nombre, fecha_inicio, estado ),
                eventos_categorias ( categorias ( nombre ) )
            `)
            .eq('atleta_id', usuarioId)
            .order('created_at', { ascending: false });

        // 4. Traer publicaciones (estilo Facebook)
        const { data: publicaciones } = await supabase
            .from('atleta_publicaciones')
            .select(`
                *,
                publicacion_comentarios (
                    *,
                    profiles ( nombre )
                )
            `)
            .eq('atleta_id', usuarioId)
            .order('created_at', { ascending: false });

        res.render('atleta_vistas/perfil', {
            atleta: atleta || {},
            preparadores: preparadores || [],
            historial: historial || [],
            publicaciones: publicaciones || [],
            user: res.locals.user
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

const subirPublicacion = async (req, res) => {
    const usuarioId = res.locals.user?.id;
    const { descripcion } = req.body;
    
    try {
        if (!req.file) throw new Error("Debe seleccionar una imagen.");

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${usuarioId}.${fileExt}`;
        const filePath = `social/${fileName}`;

        // Se asume la existencia del bucket 'atleta-galeria' en Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('atleta-galeria')
            .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('atleta-galeria').getPublicUrl(filePath);

        const { error: dbError } = await supabase
            .from('atleta_publicaciones')
            .insert({
                atleta_id: usuarioId,
                imagen_url: urlData.publicUrl,
                descripcion
            });

        if (dbError) throw dbError;

        res.redirect('/atletas/perfil');
    } catch (error) {
        console.error("🔥 Error subiendo publicación:", error.message);
        res.status(500).send("Error al subir la publicación: " + error.message);
    }
};

const comentarPublicacion = async (req, res) => {
    const usuarioId = res.locals.user?.id;
    const { publicacion_id, comentario } = req.body;

    try {
        const { error } = await supabase
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
            .select('eventos_categorias(categorias(nombre)), id_evento, estatus_pesaje')
            .eq('atleta_id', atletaId)
            .eq('id_evento', idEvento);

        // 3. Info del evento para sacar los precios
        const { data: evento } = await supabase
            .from('eventos').select('*').eq('id', idEvento).single();

        if (!evento) throw new Error("Evento no encontrado.");

        // 4. Cálculo de Monto (Lógica FDFF: 1ra cat + adicionales)
        const cant = (inscripciones || []).length;
        const totalPagado = cant > 0 ? (evento.costo_primera_cat + (cant - 1) * (evento.costo_adicional || 0)) : 0;

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
        // Traemos eventos activos o finalizados recientemente para el selector del fotógrafo
        const { data: eventos, error } = await supabase
            .from('eventos')
            .select('id, nombre')
            .order('fecha_inicio', { ascending: false });

        if (error) throw error;
        res.render('fotografo/upload', { eventosActivos: eventos || [] });
    } catch (error) {
        console.error('🔥 Error panel fotógrafo:', error.message);
        res.redirect('/eventos/competencias');
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
                atletas (
                    nombre,
                    provincia,
                    preparador,
                    peso,
                    estatura,
                    fecha_nacimiento
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
                foto_atletica_url: competidor.foto_atletica_url
            }
        });
    } catch (error) {
        console.error('🔥 Error en pantalla LED:', error.message);
        res.status(500).send('Error al cargar la pantalla LED');
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
    subirPublicacion,
    comentarPublicacion,
    verComprobanteInscripcion,
    verUploadFotografo,
    verEntradaAtleta
};
