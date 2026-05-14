const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/auth');
const supabase = require('../supabaseClient');

router.get('/', (req, res) => {
    res.render('index', { titulo: 'BatWeb - Inicio' });
});
  
router.get('/servicios', checkRole(['atleta', 'admin']), (req, res) => {
    res.render('servicios', { titulo: 'Servicios BatWeb' });
});

router.get('/afiliacion', async (req, res) => {
    try {
        // 1. Traemos solo los preparadores validados por la federación
        const { data: arrayPreparadores, error } = await supabase
            .from('preparadores')
            .select('id, nombre_completo, gimnasio_labora')
            .eq('estatus_afiliacion', 'habilitado')
            .order('nombre_completo', { ascending: true });

        if (error) throw error;

        // 2. Enviamos la lista de preparadores a la vista
        res.render('afiliacion', {
            arrayPreparadores: arrayPreparadores || []
        });
    } catch (error) {
        console.error('Error cargando afiliación:', error.message);
        res.render('afiliacion', { arrayPreparadores: [] });
    }
});

router.get('/preparadores/registrar', (req, res) => {
    res.render('afiliacionPreparador', { query: req.query });
});

router.post('/preparadores/registrar', async (req, res) => {
    const { nombre_completo, cedula, gimnasio } = req.body;

    try {
        const { error } = await supabase.from('preparadores').insert([{
            nombre_completo,
            cedula,
            gimnasio_labora: gimnasio,
            estatus: 'pendiente'
        }]);

        if (error) throw error;

        res.redirect('/preparadores/registrar?success=1');
    } catch (error) {
        console.error('Error registrando preparador:', error.message);
        res.render('afiliacionPreparador', {
            error: error.message,
            nombre_completo,
            cedula,
            gimnasio
        });
    }
});

router.get('/jueces', checkRole(['general', 'juez', 'admin']), (req, res) => {
    res.render('jueces', { titulo: 'Comité de Jueces' });
});

router.get('/noticias', checkRole(['general', 'admin']), (req, res) => {
    res.render('noticias', { titulo: 'Noticias FDFF' });
});

router.get('/social', checkRole(['general', 'admin']), (req, res) => {
    res.render('social', { titulo: 'Federados Social' });
});

module.exports = router;
