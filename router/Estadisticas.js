const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/auth');
const estadisticasController = require('../controllers/estadisticasController');

// 1. VISTA PRINCIPAL DE ESTADÍSTICAS (LISTAR CATEGORÍAS/EVENTOS)
router.get('/', estadisticasController.listarEstadisticas);

// RUTAS ESTÁTICAS (deben ir ANTES que /:id para que Express no las intercepte)

// 4. MESA DE CÓMPUTO PARA UNA CATEGORÍA ESPECÍFICA
router.get('/mesa-computo/:eventoCatId', checkRole(['admin', 'estadistico']), estadisticasController.verMesaComputo);

// 5. OFICIALIZAR CATEGORÍA Y GUARDAR RESULTADOS FINALES
router.post('/oficializar-categoria', checkRole(['admin', 'estadistico']), estadisticasController.oficializarCategoria);

// 7. MESA DE CÓMPUTO ESPECÍFICA PARA ABSOLUTOS
router.get('/mesa-computo-absoluto', checkRole(['admin', 'estadistico']), estadisticasController.verMesaComputoAbsoluto);

// 8. OFICIALIZAR GANADOR ABSOLUTO (Inyección de puntos a Team)
router.post('/oficializar-absoluto', checkRole(['admin', 'estadistico']), estadisticasController.oficializarAbsoluto);

// 10. PANEL DEL PRESIDENTE DE MESA
router.get('/presidente-mesa/:eventoCatId', checkRole(['admin', 'estadistico']), estadisticasController.verPresidenteMesa);

// 13. COMPARACIÓN TOP 5 — Vista del Juez (tablet)
router.get('/comparacion/:eventoCatId', checkRole(['admin', 'estadistico', 'juez']), estadisticasController.verComparacionJuez);

// 14. GUARDAR SELECCIÓN TOP 5 DE UN JUEZ
router.post('/guardar-top5', checkRole(['admin', 'estadistico', 'juez']), estadisticasController.guardarTop5);

// 15. ENVIAR CLASIFICADOS AL MC Y BACKSTAGE
router.post('/enviar-clasificados-mc', checkRole(['admin', 'estadistico']), estadisticasController.enviarClasificadosMC);

// 11. IMPRESIÓN MASIVA DE CERTIFICADOS
router.get('/imprimir-certificados/:eventoId', checkRole(['admin', 'ejecutivo', 'estadistico']), estadisticasController.imprimirCertificadosMasivos);

// 12. PREVISUALIZACIÓN DE CERTIFICADO PARA EL STAFF
router.get('/certificado-preview/:idCompetidor', checkRole(['admin', 'ejecutivo', 'estadistico']), estadisticasController.verCertificadoPreview);

// RUTAS CON PARÁMETROS DINÁMICOS (van al final para no interceptar rutas estáticas)

// 2. VISTA DE CÁLCULOS PARA UN EVENTO ESPECÍFICO
router.get('/:id', estadisticasController.verCalculosEvento);

// 3. CÁLCULO FINAL DE POSICIONES OFICIALES (Regla IFBB - Extremas eliminadas)
router.post('/:id/calcular/:catId', checkRole(['estadistico', 'admin']), estadisticasController.calcularPosiciones);

// 6. DETECTOR DE CAMPEONES Y GESTIÓN DE ABSOLUTOS
router.get('/:idEvento/absolutos', checkRole(['admin', 'estadistico']), estadisticasController.verGestionAbsolutos);

// 9. GENERAR BOLETAS DE VOTACIÓN MASIVAS (PARA IMPRESIÓN FÍSICA)
router.get('/:idEvento/imprimir-boletas', checkRole(['admin', 'estadistico']), estadisticasController.imprimirBoletas);

module.exports = router;
