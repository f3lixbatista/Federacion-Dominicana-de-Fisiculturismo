const express = require('express');
const router = express.Router();
const { requireAuth, checkRole, checkPermiso } = require('../middlewares/auth');
const atletasController = require('../controllers/atletasController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// 1. RUTA DE AFILIACIÓN (Fuera de requireAuth)
router.post('/solicitar-afiliacion', atletasController.solicitarAfiliacion);

// 2. Middleware de protección para el resto de rutas
router.use(requireAuth);

// Rutas de Perfil (Accesibles para el Atleta logueado)
router.get('/perfil', atletasController.verPerfilPropio);
router.post('/perfil/actualizar-team', atletasController.actualizarTeamPropio);
router.post('/perfil/subir-foto', upload.single('imagen'), atletasController.subirPublicacion);
router.post('/perfil/foto-oficial', upload.single('foto'), atletasController.actualizarFotoPerfil);
router.post('/perfil/subir-musica', upload.single('musica'), atletasController.subirMusicaCompetidor);
router.post('/perfil/like', atletasController.darLikePublicacion);
router.post('/perfil/comentar', atletasController.comentarPublicacion);
// Comprobante: el atleta accede a su propio recurso → se mantiene checkRole estático
router.get('/mi-comprobante/:idEvento', checkRole(['atleta', 'admin']), atletasController.verComprobanteInscripcion);
router.post('/validar-afiliacion', checkPermiso('atletas', 'editar'), atletasController.validarAfiliacion);

// Rutas Administrativas (dinámicas por rol_permisos)
router.get('/', checkPermiso('atletas', 'ver'), atletasController.listarAtletas);
router.get('/crear', atletasController.mostrarFormularioCrear);
router.post('/crear', checkPermiso('atletas', 'crear'), upload.none(), atletasController.crearAtleta);
router.get('/:id', checkPermiso('atletas', 'ver'), atletasController.detalleAtleta);
router.delete('/:id', checkPermiso('atletas', 'eliminar'), atletasController.eliminarAtleta);
router.put('/:id', checkPermiso('atletas', 'editar'), atletasController.actualizarAtleta);

module.exports = router;
