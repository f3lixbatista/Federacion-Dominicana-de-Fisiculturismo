const express = require('express');
const router = express.Router();
const { requireAuth, checkRole, checkPermiso } = require('../middlewares/auth');
const inscripcionController = require('../controllers/inscripcionController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.get('/', checkPermiso('pesaje', 'ver'), inscripcionController.inscripcionPage);
router.post('/cerrar-web', checkPermiso('pesaje', 'editar'), inscripcionController.cerrarInscripcionesWeb);
router.post('/asignar-numeros', checkPermiso('pesaje', 'editar'), inscripcionController.asignarNumeros);
router.post('/guardar-asistida', checkPermiso('pesaje', 'crear'), inscripcionController.guardarInscripcionAsistida);
router.get('/ficha-atleta', checkPermiso('pesaje', 'ver'), inscripcionController.fichaAtleta);
router.post('/subir-musica', checkPermiso('pesaje', 'crear'), upload.single('musica'), inscripcionController.subirMusicaAsistida);
router.get(['/InscripcionAtleta', '/IscripcionAtleta'], checkRole(['atleta', 'admin']), inscripcionController.inscripcionAtletaPage);
router.post('/inscribir', checkRole(['atleta', 'admin']), inscripcionController.inscribirAtleta);
router.post('/subir-comprobante-web', checkRole(['atleta', 'admin']), upload.single('comprobante'), inscripcionController.subirComprobanteWeb);
// Descargo imprimible (abierto a admin/ejecutivo/juez que asisten el pesaje)
router.get('/descargo', checkPermiso('pesaje', 'ver'), inscripcionController.descargoAtleta);
// Listados oficiales
router.get('/listado-atletas/:eventoId', checkPermiso('pesaje', 'ver'), inscripcionController.listadoAtletas);
router.get('/listado-posiciones/:eventoId', checkPermiso('pesaje', 'ver'), inscripcionController.listadoPosiciones);
router.post('/publicar-listado', checkPermiso('noticias', 'crear'), inscripcionController.publicarListado);
router.put('/:id', inscripcionController.crearCompetidor);
router.get('/pesaje', checkPermiso('pesaje', 'ver'), inscripcionController.pesajePage);
router.get('/:id', inscripcionController.detalleInscripcion);

module.exports = router;
