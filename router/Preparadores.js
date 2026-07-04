const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { requireAuth, checkPermiso } = require('../middlewares/auth');
const preparadoresController = require('../controllers/preparadoresController');

// Rutas públicas (sin requireAuth)
router.get('/ranking-teams', preparadoresController.verRankingTeams);
router.get('/equipos', preparadoresController.listarEquipos);
router.get('/team/:id', preparadoresController.verTeam);

// El resto de rutas requiere autenticación
router.use(requireAuth);

// Listado y gestión de coaches
router.get('/', checkPermiso('preparadores', 'ver'), preparadoresController.listarPreparadores);
router.get('/registrar', checkPermiso('preparadores', 'crear'), preparadoresController.mostrarFormularioRegistrar);
router.post('/registrar', checkPermiso('preparadores', 'crear'), preparadoresController.registrarPreparador);
router.post('/habilitar/:id', checkPermiso('preparadores', 'editar'), preparadoresController.habilitarPreparador);

// Panel del coach (preparador ve su propio dashboard)
router.get('/panel', checkPermiso('preparadores', 'ver'), preparadoresController.verPanel);

// Redirect al team propio (para el sidebar — no necesita ID en la URL)
router.get('/mi-team', checkPermiso('preparadores', 'ver'), preparadoresController.verMiTeam);

// Editar perfil del team (requiere auth + permiso preparadores:editar — el propio coach o admin)
router.get('/team/:id/editar', checkPermiso('preparadores', 'editar'), preparadoresController.editarTeamPage);
router.post('/team/:id/editar',
    checkPermiso('preparadores', 'editar'),
    upload.fields([{ name: 'foto_portada', maxCount: 1 }, { name: 'foto_perfil', maxCount: 1 }]),
    preparadoresController.guardarTeam
);

module.exports = router;
