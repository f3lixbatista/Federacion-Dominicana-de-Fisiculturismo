const express = require('express');
const router = express.Router();
const { checkRole, checkPermiso } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');
const { supabaseAdmin } = require('../config/supabase');

// Ruta accesible por admin y estadístico (fuera del guard global de admin)
router.post('/corregir-foto-atletica', checkRole(['admin', 'estadistico']), async (req, res) => {
    const { competidorId, nuevaUrl } = req.body;
    await supabaseAdmin.from('competidores').update({ foto_atletica_url: nuevaUrl }).eq('id', competidorId);
    res.json({ ok: true });
});

// Notificaciones push (solo admin por defecto)
router.post('/test-push', checkPermiso('notificaciones', 'crear'), adminController.testPush);

// Gestión de Personal (Staff)
router.get('/registro_staff', checkPermiso('staff', 'ver'), adminController.verRegistroStaff);
router.post('/registro_staff/guardar', checkPermiso('staff', 'crear'), adminController.guardarStaff);
router.delete('/registro_staff/:id', checkPermiso('staff', 'eliminar'), adminController.eliminarStaff);

// Reportes financieros (delegables a ejecutivo/estadístico)
router.get('/reporte-caja', checkPermiso('finanzas', 'ver'), adminController.verReporteCaja);
router.get('/auditoria-pagos', checkPermiso('finanzas', 'ver'), adminController.verAuditoriaPagos);

// ── GESTIÓN DINÁMICA DE ROLES Y PERMISOS — solo admin del sistema ─────────────
router.use('/roles', checkRole(['admin']));
router.get('/roles', adminController.verDashboardRoles);
router.post('/roles/permiso', adminController.actualizarPermiso);
router.post('/roles/crear', adminController.crearRol);
router.delete('/roles/:id', adminController.eliminarRol);
router.post('/roles/recargar', adminController.recargarPermisos);

module.exports = router;