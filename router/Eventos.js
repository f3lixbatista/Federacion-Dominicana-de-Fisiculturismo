const express = require('express');
const routerEventos = express.Router();
const { checkRole, checkPermiso } = require('../middlewares/auth');
const eventosController = require('../controllers/eventosController');
const estadisticasController = require('../controllers/estadisticasController');
const atletasController = require('../controllers/atletasController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// A. LISTADO GLOBAL: todos los roles con sesión pueden ver eventos
routerEventos.get('/competencias', checkPermiso('eventos', 'ver'), eventosController.listarEventos);

routerEventos.get('/', (req, res) => {
    res.redirect('/eventos/competencias');
});

// HISTÓRICO Y RESULTADOS PÚBLICOS (sin protección)
routerEventos.get('/historico', eventosController.verHistorico);
routerEventos.get('/:id/resultados-publicos', eventosController.verResultadosPublicos);

// DASHBOARD DEL EVENTO
routerEventos.get('/:id', checkPermiso('eventos', 'ver'), eventosController.verDashboardEvento);

// CENTRO DE MANDO: admin, ejecutivo y estadístico (editar)
routerEventos.get('/:id/centro-mando', checkPermiso('eventos', 'editar'), eventosController.verCentroMando);

// AUDITORÍA FINANCIERA
routerEventos.get('/:id/recaudacion', checkPermiso('eventos', 'editar'), eventosController.verAuditoriaRecaudacion);

// EDITAR EVENTO
routerEventos.get('/editar/:id', checkPermiso('eventos', 'editar'), eventosController.verEditarEvento);
routerEventos.post('/editar/:id', checkPermiso('eventos', 'editar'), upload.fields([
    { name: 'banner_evento', maxCount: 1 },
    { name: 'banner_pesaje', maxCount: 1 }
]), eventosController.actualizarEvento);

// BROADCAST: Pantalla LED de entrada
routerEventos.get('/:idEvento/entrada/:idAtleta', checkPermiso('broadcast', 'ver'), atletasController.verEntradaAtleta);

// PREPARACIÓN DE EVENTO
routerEventos.get('/preparacion-evento/:id', checkPermiso('eventos', 'editar'), eventosController.prepararEventoPage);

// MONITOR MC
routerEventos.get('/:id/monitor-mc', checkPermiso('broadcast', 'ver'), eventosController.verMonitorMC);

routerEventos.get('/:id/preparacion', checkPermiso('eventos', 'editar'), eventosController.prepararEventoPage);
routerEventos.post('/preparacion/oficializar', checkPermiso('eventos', 'editar'), eventosController.oficializarPreparacion);

// MESA DE CÓMPUTO (vinculada a estadísticas)
routerEventos.get('/:id/computo/:eventoCatId', checkPermiso('estadisticas', 'ver'), estadisticasController.verMesaComputo);
routerEventos.get('/:id/mesa-tecnica-actual', checkPermiso('estadisticas', 'ver'), estadisticasController.verMesaComputoActual);

// INYECTAR JUECES AL MC
routerEventos.post('/:id/inyectar-jueces-mc', checkPermiso('estadisticas', 'editar'), eventosController.inyectarJuecesMC);

// VOTACIÓN: el juez accede a su boleta — se mantiene checkRole estático
routerEventos.get('/:id/votacion', checkRole(['admin', 'juez']), eventosController.verBoletaJuez);

// REPORTE OFICIAL
routerEventos.get('/:id/reporte-oficial', checkPermiso('estadisticas', 'ver'), eventosController.verReporteOficial);

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
routerEventos.get('/:id/dj-consola', checkPermiso('broadcast', 'ver'), eventosController.verDJConsola);
routerEventos.get('/:id/broadcast-live', checkPermiso('broadcast', 'editar'), eventosController.verBroadcastLive);

// LOWER THIRD: Overlay para OBS/vMix (sin auth)
routerEventos.get('/:id/lower-third', eventosController.verLowerThird);

// FOTOGRAFÍA
routerEventos.get('/fotografia/gestion-atletica/:id', checkPermiso('fotografo', 'ver'), eventosController.verGestionFotografia);

// RUTAS FINANCIERAS
routerEventos.post('/ingreso-extra', checkPermiso('eventos', 'editar'), eventosController.registrarIngresoExtra);
routerEventos.post('/gasto-operativo', checkPermiso('eventos', 'editar'), upload.single('recibo_foto'), eventosController.registrarGastoOperativo);

module.exports = routerEventos;
