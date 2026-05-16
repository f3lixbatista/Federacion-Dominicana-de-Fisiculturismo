const express = require('express');
const router = express.Router();
const { requireAuth, checkRole } = require('../middlewares/auth');
const atletasController = require('../controllers/atletasController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

// Rutas de Perfil (Accesibles para el Atleta logueado)
router.get('/perfil', atletasController.verPerfilPropio);
router.post('/perfil/actualizar-team', atletasController.actualizarTeamPropio);
router.post('/perfil/subir-foto', upload.single('imagen'), atletasController.subirPublicacion);
router.post('/perfil/comentar', atletasController.comentarPublicacion);

// Rutas Administrativas (Protegidas por Rol)
router.get('/', checkRole(['juez', 'admin']), atletasController.listarAtletas);
router.get('/crear', atletasController.mostrarFormularioCrear);
router.post('/crear', checkRole(['admin', 'estadistico']), atletasController.crearAtleta);
router.get('/:id', checkRole(['juez', 'admin']), atletasController.detalleAtleta);
router.delete('/:id', checkRole(['admin']), atletasController.eliminarAtleta);
router.put('/:id', checkRole(['admin', 'estadistico']), atletasController.actualizarAtleta);

module.exports = router;
