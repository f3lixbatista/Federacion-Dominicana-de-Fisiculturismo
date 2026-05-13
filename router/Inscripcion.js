const express = require('express');
const router = express.Router();
const { requireAuth, checkRole } = require('../middlewares/auth');
const inscripcionController = require('../controllers/inscripcionController');

router.use(requireAuth);

router.get('/', inscripcionController.inscripcionPage);
router.post('/asignar-numeros', checkRole(['estadistico', 'admin', 'juez']), inscripcionController.asignarNumeros);
router.post('/guardar-asistida', checkRole(['admin', 'estadistico', 'ejecutivo']), inscripcionController.guardarInscripcionAsistida);
router.get('/InscripcionAtleta', checkRole(['atleta', 'admin']), inscripcionController.inscripcionAtletaPage);
router.put('/:id', inscripcionController.crearCompetidor);
router.get('/pesaje', checkRole(['estadistico', 'admin', 'juez']), inscripcionController.pesajePage);
router.get('/:id', inscripcionController.detalleInscripcion);

module.exports = router;
