const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

// Aplicamos protección de autenticación a todas las rutas de este archivo
router.use(checkRole(['admin'])); // Solo administradores pueden acceder a estas rutas

// Ruta para enviar notificaciones push de prueba
router.post('/test-push', adminController.testPush);

// Rutas para Gestión de Personal (Staff y Jueces)
router.get('/registro_staff', adminController.verRegistroStaff);
router.post('/registro_staff/guardar', adminController.guardarStaff);
router.delete('/registro_staff/:id', adminController.eliminarStaff);
router.get('/reporte-caja', adminController.verReporteCaja);
router.get('/auditoria-pagos', adminController.verAuditoriaPagos);

module.exports = router;