const express = require('express');
const router = express.Router();
const { requireAuth, checkRole } = require('../middlewares/auth');
const inscripcionController = require('../controllers/inscripcionController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.get('/', checkRole(['admin', 'ejecutivo', 'estadistico']), inscripcionController.inscripcionPage);
router.post('/cerrar-web', checkRole(['admin', 'ejecutivo']), inscripcionController.cerrarInscripcionesWeb);
router.post('/asignar-numeros', checkRole(['estadistico', 'admin', 'juez']), inscripcionController.asignarNumeros);
router.post('/guardar-asistida', checkRole(['admin', 'estadistico', 'ejecutivo']), inscripcionController.guardarInscripcionAsistida);
router.get('/ficha-atleta', checkRole(['admin', 'estadistico', 'ejecutivo', 'juez']), inscripcionController.fichaAtleta);
router.post('/subir-musica', checkRole(['admin', 'estadistico', 'ejecutivo', 'juez']), upload.single('musica'), inscripcionController.subirMusicaAsistida);
router.get(['/InscripcionAtleta', '/IscripcionAtleta'], checkRole(['atleta', 'admin']), inscripcionController.inscripcionAtletaPage);
router.post('/inscribir', checkRole(['atleta', 'admin']), inscripcionController.inscribirAtleta);
router.put('/:id', inscripcionController.crearCompetidor);
router.get('/pesaje', checkRole(['estadistico', 'admin', 'juez']), inscripcionController.pesajePage);
router.get('/:id', inscripcionController.detalleInscripcion);

module.exports = router;
