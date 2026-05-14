const express = require('express');
const routerEventos = express.Router();
const { checkRole } = require('../middlewares/auth');
const eventosController = require('../controllers/eventosController');

// A. LISTADO GLOBAL: Lo que ve todo el mundo al entrar
routerEventos.get('/', eventosController.listarEventos);

// B. DASHBOARD DEL EVENTO: La página única para cada competencia
routerEventos.get('/:id', eventosController.verDashboardEvento);

// RUTA DE PREPARACIÓN DE EVENTO (alias compatible con la estructura anterior)
routerEventos.get('/preparacion-evento/:id', checkRole(['admin', 'estadistico']), eventosController.prepararEventoPage);

// RUTA PÚBLICA DE MONITOR MC
routerEventos.get('/:id/monitor-mc', checkRole(['admin', 'estadistico', 'mc']), eventosController.verMonitorMC);

routerEventos.get('/:id/preparacion', checkRole(['ejecutivo', 'admin']), eventosController.prepararEventoPage);

routerEventos.post('/preparacion/oficializar', checkRole(['ejecutivo', 'admin']), eventosController.oficializarPreparacion);

// RUTA PARA MESA DE CÓMPUTO ESTADÍSTICO
routerEventos.get('/:id/computo/:catId', checkRole(['estadistico', 'admin']), eventosController.verMesaComputo);

// RUTA PARA INYECTAR JUECES CONFIRMADOS AL MC EN TIEMPO REAL
routerEventos.post('/:id/inyectar-jueces-mc', checkRole(['admin', 'estadistico']), eventosController.inyectarJuecesMC);

// RUTA GET: Validación de Asiento y Renderizado de Boleta Digital para el Juez
routerEventos.get('/:id/votacion', checkRole(['admin', 'juez']), eventosController.verBoletaJuez);

// RUTA PARA REPORTE OFICIAL DEL EVENTO
routerEventos.get('/:id/reporte-oficial', checkRole(['admin', 'estadistico', 'juez']), eventosController.verReporteOficial);

// RUTA PARA DIPLOMA DIGITAL
routerEventos.get('/atleta/:idAtleta/evento/:idEvento/diploma', eventosController.verDiplomaAtleta);

// RUTA PARA PANEL BACKSTAGE
routerEventos.get('/:id/backstage', checkRole(['admin', 'backstage', 'estadistico']), eventosController.verBackstage);

module.exports = routerEventos;
