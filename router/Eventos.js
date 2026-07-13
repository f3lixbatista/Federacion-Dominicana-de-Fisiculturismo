const express = require('express');
const routerEventos = express.Router();
const { checkRole, checkPermiso } = require('../middlewares/auth');
const eventosController = require('../controllers/eventosController');
const estadisticasController = require('../controllers/estadisticasController');
const atletasController = require('../controllers/atletasController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { cacheMiddleware } = require('../services/cache');

// A. LISTADO GLOBAL — cache 60 seg (cambia al crear/actualizar eventos)
routerEventos.get('/competencias', checkPermiso('eventos', 'ver'), cacheMiddleware(60), eventosController.listarEventos);

routerEventos.get('/', (req, res) => {
    res.redirect('/eventos/competencias');
});

// HISTÓRICO — cache 30 min (solo añade datos al cerrar eventos)
routerEventos.get('/historico', cacheMiddleware(1800), eventosController.verHistorico);
routerEventos.get('/:id/resultados-publicos', eventosController.verResultadosPublicos);

// DASHBOARD DEL EVENTO
routerEventos.get('/:id', checkPermiso('eventos', 'ver'), eventosController.verDashboardEvento);

// CENTRO DE MANDO: programa de competencia
routerEventos.get('/:id/centro-mando', checkPermiso('programa', 'ver'), eventosController.verCentroMando);

// AUDITORÍA FINANCIERA
routerEventos.get('/:id/recaudacion', checkPermiso('finanzas', 'ver'), eventosController.verAuditoriaRecaudacion);

// EDITAR EVENTO
routerEventos.get('/editar/:id', checkPermiso('eventos', 'editar'), eventosController.verEditarEvento);
routerEventos.post('/editar/:id', checkPermiso('eventos', 'editar'), upload.fields([
    { name: 'banner_evento', maxCount: 1 },
    { name: 'banner_pesaje', maxCount: 1 }
]), eventosController.actualizarEvento);

// PRODUCCIÓN: Pantalla LED de entrada de atleta
routerEventos.get('/:idEvento/entrada/:idAtleta', checkPermiso('produccion', 'ver'), atletasController.verEntradaAtleta);

// PREPARACIÓN DE EVENTO
routerEventos.get('/preparacion-evento/:id', checkPermiso('preparacion', 'editar'), eventosController.prepararEventoPage);

// MONITOR MC
routerEventos.get('/:id/monitor-mc', checkPermiso('monitor_mc', 'ver'), eventosController.verMonitorMC);

routerEventos.get('/:id/preparacion', checkPermiso('preparacion', 'editar'), eventosController.prepararEventoPage);
routerEventos.post('/preparacion/oficializar', checkPermiso('preparacion', 'editar'), eventosController.oficializarPreparacion);

// MESA DE CÓMPUTO
routerEventos.get('/:id/computo/:eventoCatId', checkPermiso('computo', 'ver'), estadisticasController.verMesaComputo);
routerEventos.get('/:id/mesa-tecnica-actual', checkPermiso('computo', 'ver'), estadisticasController.verMesaComputoActual);

// INYECTAR JUECES AL MC
routerEventos.post('/:id/inyectar-jueces-mc', checkPermiso('computo', 'editar'), eventosController.inyectarJuecesMC);

// VOTACIÓN: el juez accede a su boleta — se mantiene checkRole estático
routerEventos.get('/:id/votacion', checkRole(['admin', 'juez']), eventosController.verBoletaJuez);

// REPORTE OFICIAL
routerEventos.get('/:id/reporte-oficial', checkPermiso('reportes', 'ver'), eventosController.verReporteOficial);

// DIPLOMA DIGITAL (público por atleta)
routerEventos.get('/atleta/:idAtleta/evento/:idEvento/diploma', eventosController.verDiplomaAtleta);

// VALIDACIÓN DE LOGRO (escaneo QR — público)
routerEventos.get('/validar-logro/:idCompetidor', eventosController.validarLogroPublico);

// CERTIFICADO OFICIAL: atleta accede al suyo — se mantiene checkRole estático
routerEventos.get('/atleta/:idAtleta/evento/:idEvento/certificado-oficial', checkRole(['admin', 'atleta', 'estadistico']), eventosController.verCertificadoOficial);

// BACKSTAGE
routerEventos.get('/:id/backstage', checkPermiso('backstage', 'ver'), eventosController.verBackstage);
routerEventos.get('/:id/backstage-seguridad', checkPermiso('backstage', 'ver'), eventosController.verBackstageSeguridad);
routerEventos.get('/:id/validar-acceso/:idAtleta', checkPermiso('backstage', 'ver'), eventosController.validarAccesoAtleta);

// DJ Y BROADCAST
routerEventos.get('/:id/dj-consola', checkPermiso('dj', 'ver'), eventosController.verDJConsola);
routerEventos.get('/:id/broadcast-live', checkPermiso('vmd', 'ver'), eventosController.verBroadcastLive);

// LOWER THIRD: Overlay para OBS/vMix (sin auth)
routerEventos.get('/:id/lower-third', eventosController.verLowerThird);

// FOTOGRAFÍA
routerEventos.get('/fotografia/gestion-atletica/:id', checkPermiso('fotografo', 'ver'), eventosController.verGestionFotografia);

// RUTAS FINANCIERAS
routerEventos.post('/ingreso-extra', checkPermiso('finanzas', 'crear'), eventosController.registrarIngresoExtra);
routerEventos.post('/gasto-operativo', checkPermiso('finanzas', 'crear'), upload.single('recibo_foto'), eventosController.registrarGastoOperativo);

module.exports = routerEventos;
