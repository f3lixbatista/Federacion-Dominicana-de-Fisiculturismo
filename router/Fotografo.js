const express = require('express');
const router = express.Router();
const atletasController = require('../controllers/atletasController');
const { requireAuth, checkRole } = require('../middlewares/auth');

// Aplicamos protección de autenticación a todas las rutas de este archivo
router.use(requireAuth);

// Vinculamos la ruta al método del controlador
router.get('/upload', checkRole(['admin', 'fotografo']), atletasController.verUploadFotografo);

module.exports = router;
