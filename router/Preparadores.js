const express = require('express');
const router = express.Router();
const { requireAuth, checkPermiso } = require('../middlewares/auth');
const preparadoresController = require('../controllers/preparadoresController');

// Ranking de equipos — público (sin requireAuth)
router.get('/ranking-teams', preparadoresController.verRankingTeams);

// El resto de rutas requiere autenticación
router.use(requireAuth);

// Listado y gestión de coaches
router.get('/', checkPermiso('preparadores', 'ver'), preparadoresController.listarPreparadores);
router.get('/registrar', checkPermiso('preparadores', 'crear'), preparadoresController.mostrarFormularioRegistrar);
router.post('/registrar', checkPermiso('preparadores', 'crear'), preparadoresController.registrarPreparador);
router.post('/habilitar/:id', checkPermiso('preparadores', 'editar'), preparadoresController.habilitarPreparador);

// Panel del coach (preparador ve su propio dashboard)
router.get('/panel', checkPermiso('preparadores', 'ver'), preparadoresController.verPanel);

module.exports = router;
