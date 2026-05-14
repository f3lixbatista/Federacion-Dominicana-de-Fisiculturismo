const supabase = require('../supabaseClient');

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
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) throw new Error('Error en Auth: ' + authError.message);

        const newUserId = authData.user.id;

        const { error: errorProfile } = await supabase
            .from('profiles')
            .insert([{ id: newUserId, nombre, role: 'atleta', cedula, email }]);

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

        res.render('atletas/perfil', {
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

        res.redirect('/mi-perfil');
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
    comentarPublicacion
};
