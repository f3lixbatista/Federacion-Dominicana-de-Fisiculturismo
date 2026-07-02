const express = require('express');
const router = express.Router();
const { requireAuth, checkRole } = require('../middlewares/auth');
const atletasController = require('../controllers/atletasController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 1. RUTA DE AFILIACIÓN (Fuera de requireAuth)
 * La movemos aquí para que el controlador pueda devolver un error JSON 401
 * en lugar de que el middleware redirija a la página HTML de login.
 */
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
router.get('/mi-comprobante/:idEvento', checkRole(['atleta', 'admin']), atletasController.verComprobanteInscripcion);
router.post('/validar-afiliacion', checkRole(['admin', 'estadistico']), atletasController.validarAfiliacion);

// Rutas Administrativas (Protegidas por Rol)
router.get('/', checkRole(['juez', 'admin']), atletasController.listarAtletas);
router.get('/crear', atletasController.mostrarFormularioCrear);
// upload.none() permite procesar campos de texto en formularios con enctype="multipart/form-data"
router.post('/crear', checkRole(['admin', 'estadistico']), upload.none(), atletasController.crearAtleta);
router.get('/:id', checkRole(['juez', 'admin']), atletasController.detalleAtleta);
router.delete('/:id', checkRole(['admin']), atletasController.eliminarAtleta);
router.put('/:id', checkRole(['admin', 'estadistico']), atletasController.actualizarAtleta);

module.exports = router;
