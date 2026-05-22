const express = require('express');
const router = express.Router();
const { requireAuth, checkRole } = require('../middlewares/auth');
const preparadoresController = require('../controllers/preparadoresController');

router.use(requireAuth);

// GET /preparadores - Listado (Solo Admin/Juez)
router.get('/', checkRole(['admin', 'juez']), preparadoresController.listarPreparadores);

router.get('/registrar', checkRole(['admin']), preparadoresController.mostrarFormularioRegistrar);
router.post('/registrar', checkRole(['admin']), preparadoresController.registrarPreparador);

module.exports = router;