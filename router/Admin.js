const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

// Aplicamos protección de autenticación a todas las rutas de este archivo
router.use(checkRole(['admin'])); // Solo administradores pueden acceder a estas rutas

// Ruta para enviar notificaciones push de prueba
router.post('/test-push', adminController.testPush);

module.exports = router;