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

module.exports = {
    listarAtletas,
    mostrarFormularioCrear,
    crearAtleta,
    detalleAtleta,
    eliminarAtleta,
    actualizarAtleta
};
