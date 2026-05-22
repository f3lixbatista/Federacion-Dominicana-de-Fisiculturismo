const { supabase } = require('../supabaseClient');

const listarPreparadores = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('preparadores')
            .select('*')
            .order('nombre_completo', { ascending: true });

        if (error) throw error;

        res.render('preparadores/listado', { arrayPreparadores: data || [] });
    } catch (error) {
        console.error('Error al listar preparadores:', error.message);
        res.render('preparadores/listado', { arrayPreparadores: [] });
    }
};

const mostrarFormularioRegistrar = (req, res) => {
    res.render('afiliacionPreparador');
};

const registrarPreparador = async (req, res) => {
    const { nombre_completo, cedula, email, telefono, gimnasio, direccion } = req.body;

    try {
        const { error } = await supabase
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

module.exports = {
    listarPreparadores,
    mostrarFormularioRegistrar,
    registrarPreparador
};