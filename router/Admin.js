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

// Solo administradores a partir de aquí
router.use(checkRole(['admin']));

router.post('/test-push', adminController.testPush);

// Gestión de Personal (Staff)
router.get('/registro_staff', adminController.verRegistroStaff);
router.post('/registro_staff/guardar', adminController.guardarStaff);
router.delete('/registro_staff/:id', adminController.eliminarStaff);

// Reportes financieros
router.get('/reporte-caja', adminController.verReporteCaja);
router.get('/auditoria-pagos', adminController.verAuditoriaPagos);

// ── GESTIÓN DINÁMICA DE ROLES Y PERMISOS ─────────────────────────────────────
router.get('/roles', adminController.verDashboardRoles);
router.post('/roles/permiso', adminController.actualizarPermiso);
router.post('/roles/crear', adminController.crearRol);
router.delete('/roles/:id', adminController.eliminarRol);
router.post('/roles/recargar', adminController.recargarPermisos);

module.exports = router;