const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/auth');
const estadisticasController = require('../controllers/estadisticasController');

// 1. VISTA PRINCIPAL DE ESTADÍSTICAS (LISTAR CATEGORÍAS/EVENTOS)
router.get('/', estadisticasController.listarEstadisticas);

// 2. VISTA DE CÁLCULOS PARA UN EVENTO ESPECÍFICO
router.get('/:id', estadisticasController.verCalculosEvento);

// 3. CÁLCULO FINAL DE POSICIONES OFICIALES (Regla IFBB - Extremas eliminadas)
router.post('/:id/calcular/:catId', checkRole(['estadistico', 'admin']), estadisticasController.calcularPosiciones);

// 4. MESA DE CÓMPUTO PARA UNA CATEGORÍA ESPECÍFICA
router.get('/mesa-computo/:eventoCatId', checkRole(['admin', 'estadistico']), estadisticasController.verMesaComputo);

// 5. OFICIALIZAR CATEGORÍA Y GUARDAR RESULTADOS FINALES
router.post('/oficializar-categoria', checkRole(['admin', 'estadistico']), estadisticasController.oficializarCategoria);

// 6. DETECTOR DE CAMPEONES Y GESTIÓN DE ABSOLUTOS
router.get('/:idEvento/absolutos', checkRole(['admin', 'estadistico']), estadisticasController.verGestionAbsolutos);

// 7. MESA DE CÓMPUTO ESPECÍFICA PARA ABSOLUTOS
router.get('/mesa-computo-absoluto', checkRole(['admin', 'estadistico']), estadisticasController.verMesaComputoAbsoluto);

// 8. OFICIALIZAR GANADOR ABSOLUTO (Inyección de puntos a Team)
router.post('/oficializar-absoluto', checkRole(['admin', 'estadistico']), estadisticasController.oficializarAbsoluto);

// 9. GENERAR BOLETAS DE VOTACIÓN MASIVAS (PARA IMPRESIÓN FÍSICA)
router.get('/:idEvento/imprimir-boletas', checkRole(['admin', 'estadistico']), estadisticasController.imprimirBoletas);

module.exports = router;
