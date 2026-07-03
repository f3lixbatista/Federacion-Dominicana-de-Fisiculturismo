const express = require('express');
const router = express.Router();
const atletasController = require('../controllers/atletasController');
const { requireAuth, checkPermiso } = require('../middlewares/auth');

// Aplicamos protección de autenticación a todas las rutas de este archivo
router.use(requireAuth);

router.get('/upload', checkPermiso('fotografo', 'ver'), atletasController.verUploadFotografo);
router.post('/subir-foto-atletica', checkPermiso('fotografo', 'crear'), atletasController.subirFotoAtletica);

module.exports = router;
