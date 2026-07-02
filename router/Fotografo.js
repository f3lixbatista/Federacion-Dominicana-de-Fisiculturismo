const express = require('express');
const router = express.Router();
const atletasController = require('../controllers/atletasController');
const { requireAuth, checkRole } = require('../middlewares/auth');

// Aplicamos protección de autenticación a todas las rutas de este archivo
router.use(requireAuth);

router.get('/upload', checkRole(['admin', 'fotografo']), atletasController.verUploadFotografo);
router.post('/subir-foto-atletica', checkRole(['admin', 'fotografo']), atletasController.subirFotoAtletica);

module.exports = router;
