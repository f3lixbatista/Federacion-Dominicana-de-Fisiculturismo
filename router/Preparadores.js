const express = require('express');
const router = express.Router();
const { requireAuth, checkRole } = require('../middlewares/auth');
const preparadoresController = require('../controllers/preparadoresController');

// Ranking de equipos — público (sin requireAuth)
router.get('/ranking-teams', preparadoresController.verRankingTeams);

// El resto de rutas requiere autenticación
router.use(requireAuth);

// Admin/Ejecutivo: listado y gestión de coaches
router.get('/', checkRole(['admin', 'ejecutivo', 'juez']), preparadoresController.listarPreparadores);
router.get('/registrar', checkRole(['admin', 'ejecutivo']), preparadoresController.mostrarFormularioRegistrar);
router.post('/registrar', checkRole(['admin', 'ejecutivo']), preparadoresController.registrarPreparador);
router.post('/habilitar/:id', checkRole(['admin', 'ejecutivo']), preparadoresController.habilitarPreparador);

// Panel del coach (preparador ve su propio dashboard)
router.get('/panel', checkRole(['preparador', 'admin', 'ejecutivo']), preparadoresController.verPanel);

module.exports = router;
