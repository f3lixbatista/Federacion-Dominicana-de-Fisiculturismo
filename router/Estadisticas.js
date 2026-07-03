const express = require('express');
const router = express.Router();
const { checkPermiso } = require('../middlewares/auth');
const estadisticasController = require('../controllers/estadisticasController');

// 1. VISTA PRINCIPAL DE ESTADÍSTICAS (LISTAR CATEGORÍAS/EVENTOS)
router.get('/', estadisticasController.listarEstadisticas);

// RUTAS ESTÁTICAS (deben ir ANTES que /:id para que Express no las intercepte)

// 4. MESA DE CÓMPUTO PARA UNA CATEGORÍA ESPECÍFICA
router.get('/mesa-computo/:eventoCatId', checkPermiso('estadisticas', 'editar'), estadisticasController.verMesaComputo);

// 5. OFICIALIZAR CATEGORÍA Y GUARDAR RESULTADOS FINALES
router.post('/oficializar-categoria', checkPermiso('estadisticas', 'editar'), estadisticasController.oficializarCategoria);

// 7. MESA DE CÓMPUTO ESPECÍFICA PARA ABSOLUTOS
router.get('/mesa-computo-absoluto', checkPermiso('estadisticas', 'editar'), estadisticasController.verMesaComputoAbsoluto);

// 8. OFICIALIZAR GANADOR ABSOLUTO (Inyección de puntos a Team)
router.post('/oficializar-absoluto', checkPermiso('estadisticas', 'editar'), estadisticasController.oficializarAbsoluto);

// 10. PANEL DEL PRESIDENTE DE MESA
router.get('/presidente-mesa/:eventoCatId', checkPermiso('estadisticas', 'editar'), estadisticasController.verPresidenteMesa);

// 13. COMPARACIÓN TOP 5 — Vista del Juez (tablet)
router.get('/comparacion/:eventoCatId', checkPermiso('estadisticas', 'ver'), estadisticasController.verComparacionJuez);

// 14. GUARDAR SELECCIÓN TOP 5 DE UN JUEZ
router.post('/guardar-top5', checkPermiso('estadisticas', 'crear'), estadisticasController.guardarTop5);

// 15. ENVIAR CLASIFICADOS AL MC Y BACKSTAGE
router.post('/enviar-clasificados-mc', checkPermiso('estadisticas', 'editar'), estadisticasController.enviarClasificadosMC);

// 11. IMPRESIÓN MASIVA DE CERTIFICADOS
router.get('/imprimir-certificados/:eventoId', checkPermiso('estadisticas', 'ver'), estadisticasController.imprimirCertificadosMasivos);

// 12. PREVISUALIZACIÓN DE CERTIFICADO PARA EL STAFF
router.get('/certificado-preview/:idCompetidor', checkPermiso('estadisticas', 'ver'), estadisticasController.verCertificadoPreview);

// RUTAS CON PARÁMETROS DINÁMICOS (van al final para no interceptar rutas estáticas)

// 2. VISTA DE CÁLCULOS PARA UN EVENTO ESPECÍFICO
router.get('/:id', estadisticasController.verCalculosEvento);

// 3. CÁLCULO FINAL DE POSICIONES OFICIALES (Regla IFBB - Extremas eliminadas)
router.post('/:id/calcular/:catId', checkPermiso('estadisticas', 'editar'), estadisticasController.calcularPosiciones);

// 6. DETECTOR DE CAMPEONES Y GESTIÓN DE ABSOLUTOS
router.get('/:idEvento/absolutos', checkPermiso('estadisticas', 'editar'), estadisticasController.verGestionAbsolutos);

// 9. GENERAR BOLETAS DE VOTACIÓN MASIVAS (PARA IMPRESIÓN FÍSICA)
router.get('/:idEvento/imprimir-boletas', checkPermiso('estadisticas', 'editar'), estadisticasController.imprimirBoletas);

module.exports = router;
