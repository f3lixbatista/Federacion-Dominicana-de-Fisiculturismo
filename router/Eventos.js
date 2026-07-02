const express = require('express');
const routerEventos = express.Router();
const { checkRole } = require('../middlewares/auth');
const eventosController = require('../controllers/eventosController');
const estadisticasController = require('../controllers/estadisticasController');
const atletasController = require('../controllers/atletasController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// A. LISTADO GLOBAL: Lo que ve todo el mundo al entrar
routerEventos.get('/competencias', checkRole(['admin', 'estadistico', 'ejecutivo', 'preparador', 'atleta', 'juez', 'general', 'mc', 'backstage']), eventosController.listarEventos);

routerEventos.get('/', (req, res) => {
    res.redirect('/eventos/competencias');
});

// C. HISTÓRICO Y RESULTADOS PÚBLICOS (Sin protección de rol para acceso general)
routerEventos.get('/historico', eventosController.verHistorico);

routerEventos.get('/:id/resultados-publicos', eventosController.verResultadosPublicos);

// B. DASHBOARD DEL EVENTO: La página única para cada competencia
routerEventos.get('/:id', checkRole(['admin', 'estadistico', 'ejecutivo', 'preparador', 'atleta', 'juez', 'general', 'mc', 'backstage']), eventosController.verDashboardEvento);

// C. CENTRO DE MANDO: Dashboard administrativo centralizado
routerEventos.get('/:id/centro-mando', checkRole(['admin', 'estadistico', 'ejecutivo']), eventosController.verCentroMando);

// AUDITORÍA FINANCIERA DEL EVENTO
routerEventos.get('/:id/recaudacion', checkRole(['admin', 'ejecutivo', 'estadistico']), eventosController.verAuditoriaRecaudacion);

// RUTA PARA RENDERIZAR EL FORMULARIO DE EDICIÓN (Carga los datos)
routerEventos.get('/editar/:id', checkRole(['admin']), eventosController.verEditarEvento);

// RUTA PARA ACTUALIZAR DATOS Y AFICHE (Edición de Evento)
routerEventos.post('/editar/:id', checkRole(['admin']), upload.fields([
    { name: 'banner_evento', maxCount: 1 },
    { name: 'banner_pesaje', maxCount: 1 }
]), eventosController.actualizarEvento);

// RUTA DE BROADCAST: Pantalla LED de entrada
routerEventos.get('/:idEvento/entrada/:idAtleta', checkRole(['admin', 'estadistico', 'mc']), atletasController.verEntradaAtleta);

// RUTA DE PREPARACIÓN DE EVENTO (alias compatible con la estructura anterior)
routerEventos.get('/preparacion-evento/:id', checkRole(['admin', 'estadistico']), eventosController.prepararEventoPage);

// RUTA PÚBLICA DE MONITOR MC
routerEventos.get('/:id/monitor-mc', checkRole(['admin', 'estadistico', 'mc']), eventosController.verMonitorMC);

routerEventos.get('/:id/preparacion', checkRole(['ejecutivo', 'admin']), eventosController.prepararEventoPage);

routerEventos.post('/preparacion/oficializar', checkRole(['ejecutivo', 'admin']), eventosController.oficializarPreparacion);

// RUTA PARA MESA DE CÓMPUTO ESTADÍSTICO (Vinculada al controlador de estadísticas)
routerEventos.get('/:id/computo/:eventoCatId', checkRole(['estadistico', 'admin']), estadisticasController.verMesaComputo);

// REDIRECCIÓN INTELIGENTE A LA CATEGORÍA ACTUAL
routerEventos.get('/:id/mesa-tecnica-actual', checkRole(['estadistico', 'admin']), estadisticasController.verMesaComputoActual);

// RUTA PARA INYECTAR JUECES CONFIRMADOS AL MC EN TIEMPO REAL
routerEventos.post('/:id/inyectar-jueces-mc', checkRole(['admin', 'estadistico']), eventosController.inyectarJuecesMC);

// RUTA GET: Validación de Asiento y Renderizado de Boleta Digital para el Juez
routerEventos.get('/:id/votacion', checkRole(['admin', 'juez']), eventosController.verBoletaJuez);

// RUTA PARA REPORTE OFICIAL DEL EVENTO
routerEventos.get('/:id/reporte-oficial', checkRole(['admin', 'estadistico', 'juez']), eventosController.verReporteOficial);

// RUTA PARA DIPLOMA DIGITAL
routerEventos.get('/atleta/:idAtleta/evento/:idEvento/diploma', eventosController.verDiplomaAtleta);

// RUTA PÚBLICA DE VALIDACIÓN DE LOGRO (ESCANEO DE QR)
routerEventos.get('/validar-logro/:idCompetidor', eventosController.validarLogroPublico);

// RUTA PARA CERTIFICADO OFICIAL (DISEÑO LANDSCAPE)
routerEventos.get('/atleta/:idAtleta/evento/:idEvento/certificado-oficial', checkRole(['admin', 'atleta', 'estadistico']), eventosController.verCertificadoOficial);

// RUTA PARA PANEL BACKSTAGE
routerEventos.get('/:id/backstage', checkRole(['admin', 'backstage', 'estadistico']), eventosController.verBackstage);

// RUTA PARA PORTERÍA (ESCÁNER QR)
routerEventos.get('/:id/backstage-seguridad', checkRole(['admin', 'backstage', 'estadistico']), eventosController.verBackstageSeguridad);

// API: VALIDACIÓN DE ACCESO POR ATLETA (usada por el escáner QR)
routerEventos.get('/:id/validar-acceso/:idAtleta', checkRole(['admin', 'backstage', 'estadistico', 'ejecutivo']), eventosController.validarAccesoAtleta);

// RUTAS PARA PRODUCCIÓN (DJ Y BROADCAST)
routerEventos.get('/:id/dj-consola', checkRole(['admin', 'estadistico', 'mc', 'fotografo']), eventosController.verDJConsola);

routerEventos.get('/:id/broadcast-live', checkRole(['admin', 'estadistico']), eventosController.verBroadcastLive);

// LOWER THIRD: Overlay puro para OBS/vMix (sin auth — se abre en browser source)
routerEventos.get('/:id/lower-third', eventosController.verLowerThird);

// GESTIÓN DE FOTOGRAFÍA (Nueva ruta para correcciones)
routerEventos.get('/fotografia/gestion-atletica/:id', checkRole(['admin', 'ejecutivo', 'fotografo']), eventosController.verGestionFotografia);

// RUTAS FINANCIERAS ADICIONALES
routerEventos.post('/ingreso-extra', checkRole(['admin', 'ejecutivo']), eventosController.registrarIngresoExtra);
routerEventos.post('/gasto-operativo', checkRole(['admin', 'ejecutivo']), upload.single('recibo_foto'), eventosController.registrarGastoOperativo);

module.exports = routerEventos;
