const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { checkRole } = require('../middlewares/auth');

// A. Formulario público de afiliación de preparadores
router.get('/afiliacion', (req, res) => {
    res.render('preparadores/afiliacion');
});

// B. Solicitud pública de afiliación de preparadores
router.post('/solicitar', async (req, res) => {
    const { nombre_completo, cedula, email, telefono, gimnasio, direccion } = req.body;

    try {
        const { error } = await supabase.from('preparadores').insert([{
            nombre_completo,
            cedula,
            email,
            telefono,
            gimnasio_labora: gimnasio,
            direccion,
            estatus_afiliacion: 'pendiente'
        }]);

        if (error) throw error;
        res.send(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center;">
                <h1>Solicitud enviada</h1>
                <p>Su registro está en proceso de validación. Gracias por afiliarse a la FDFF.</p>
                <a href="/" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:8px;">Volver al inicio</a>
            </div>
        `);
    } catch (err) {
        console.error('Error al guardar solicitud de preparador:', err.message);
        res.status(500).send(`Error: ${err.message}`);
    }
});

// B. Listado para Admin/Ejecutivo con todas las solicitudes de preparadores
router.get('/gestion', checkRole(['admin', 'ejecutivo']), async (req, res) => {
    try {
        const { data: preparadores, error } = await supabase
            .from('preparadores')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.render('preparadores/gestion', { preparadores });
    } catch (err) {
        console.error('Error cargando preparadores:', err.message);
        res.status(500).send('No se pudo cargar la lista de solicitudes.');
    }
});

// C. Habilitar un preparador
router.post('/habilitar/:id', checkRole(['admin', 'ejecutivo']), async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('preparadores')
            .update({ estatus_afiliacion: 'habilitado' })
            .eq('id', id);

        if (error) throw error;
        res.json({ estado: true, mensaje: 'Preparador habilitado con éxito' });
    } catch (err) {
        console.error('Error habilitando preparador:', err.message);
        res.status(500).json({ estado: false, mensaje: err.message });
    }
});

module.exports = router;
