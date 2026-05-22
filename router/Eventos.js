const express = require('express');
const routerEventos = express.Router();
const { checkRole } = require('../middlewares/auth');
const eventosController = require('../controllers/eventosController');
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

// RUTA PARA ACTUALIZAR DATOS Y AFICHE (Edición de Evento)
routerEventos.post('/editar/:id', checkRole(['admin']), upload.single('banner'), eventosController.actualizarEvento);

// RUTA DE BROADCAST: Pantalla LED de entrada
routerEventos.get('/:idEvento/entrada/:idAtleta', checkRole(['admin', 'estadistico', 'mc']), atletasController.verEntradaAtleta);

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

// RUTA PÚBLICA DE VALIDACIÓN DE LOGRO (ESCANEO DE QR)
routerEventos.get('/validar-logro/:idCompetidor', eventosController.validarLogroPublico);

// RUTA PARA CERTIFICADO OFICIAL (DISEÑO LANDSCAPE)
routerEventos.get('/atleta/:idAtleta/evento/:idEvento/certificado-oficial', checkRole(['admin', 'atleta', 'estadistico']), eventosController.verCertificadoOficial);

// RUTA PARA PANEL BACKSTAGE
routerEventos.get('/:id/backstage', checkRole(['admin', 'backstage', 'estadistico']), eventosController.verBackstage);

module.exports = routerEventos;
