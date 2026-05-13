const express = require('express');
const router = express.Router();
const { requireAuth, checkRole } = require('../middlewares/auth');
const atletasController = require('../controllers/atletasController');

router.use(requireAuth);

router.get('/', atletasController.listarAtletas);
router.get('/crear', atletasController.mostrarFormularioCrear);
router.post('/crear', checkRole(['admin', 'estadistico']), atletasController.crearAtleta);
router.get('/:id', atletasController.detalleAtleta);
router.delete('/:id', atletasController.eliminarAtleta);
router.put('/:id', checkRole(['admin', 'estadistico']), atletasController.actualizarAtleta);

module.exports = router;
