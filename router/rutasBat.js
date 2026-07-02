const express = require('express');
const router = express.Router();
const { checkRole, requireAuth } = require('../middlewares/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const atletasController = require('../controllers/atletasController');

router.get('/', checkRole(['admin', 'estadistico', 'ejecutivo', 'preparador', 'atleta', 'juez', 'general', 'mc', 'backstage']), (req, res) => {
    res.render('index', { titulo: 'BatWeb - Inicio' });
});
  
router.get('/servicios', checkRole(['admin', 'estadistico', 'ejecutivo', 'preparador', 'atleta', 'juez', 'general', 'mc', 'backstage']), (req, res) => {
    res.render('servicios', { titulo: 'Servicios BatWeb' });
});

router.get('/afiliacion', requireAuth, async (req, res) => {
    try {
        const { data: arrayPreparadores, error } = await supabase
            .from('preparadores')
            .select('id, nombre_completo, gimnasio_labora')
            .eq('estatus_afiliacion', 'habilitado')
            .order('nombre_completo', { ascending: true });

        if (error) throw error;

        res.render('afiliacion', {
            arrayPreparadores: arrayPreparadores || [],
            nuevoPrepId: req.query.nuevo_prep_id || null,
            nuevoPrepNombre: req.query.nuevo_prep_nombre || null
        });
    } catch (error) {
        console.error('Error cargando afiliación:', error.message);
        res.render('afiliacion', { arrayPreparadores: [], nuevoPrepId: null, nuevoPrepNombre: null });
    }
});

router.get('/afiliacion/nuevo-preparador', requireAuth, (req, res) => {
    res.render('afiliacionPreparador', { query: req.query });
});

router.post('/afiliacion/nuevo-preparador', requireAuth, async (req, res) => {
    const { nombre_completo, cedula, gimnasio } = req.body;

    try {
        const { data: nuevoPrep, error } = await supabaseAdmin.from('preparadores').insert([{
            nombre_completo,
            cedula,
            gimnasio_labora: gimnasio,
            estatus_afiliacion: 'pendiente'
        }]).select('id').single();

        if (error) throw error;

        const params = new URLSearchParams({
            nuevo_prep_id: nuevoPrep.id,
            nuevo_prep_nombre: nombre_completo
        });
        res.redirect(`/afiliacion?${params.toString()}`);
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

module.exports = router;
