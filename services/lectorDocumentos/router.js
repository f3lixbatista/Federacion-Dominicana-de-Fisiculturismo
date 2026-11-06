const express = require('express');
const multer = require('multer');
const { TIPOS } = require('./tipos');
const { leerDocumento: leerPorDefecto, ErrorLectura, FORMATOS_IMAGEN, MAX_IMAGENES } = require('./leerDocumento');

const VENTANA_MS = 60 * 60 * 1000;

// Límite por usuario en memoria: suficiente para frenar un abuso o un bucle del navegador sin
// añadir dependencias, y el contador se reinicia con el servidor.
function crearLimitador(maxPorHora, identificar) {
  const usos = new Map();
  return (req, res, next) => {
    const id = identificar(req);
    const ahora = Date.now();
    const recientes = (usos.get(id) || []).filter((t) => ahora - t < VENTANA_MS);
    if (recientes.length >= maxPorHora) {
      return res.status(429).json({ error: 'Demasiadas lecturas de documentos en poco tiempo. Intenta de nuevo en un rato.' });
    }
    recientes.push(ahora);
    usos.set(id, recientes);
    next();
  };
}

// Fábrica del router de lectura de documentos: POST /:tipo con la(s) imagen(es) del documento en el
// campo `foto` (repetido para frente y reverso). No sabe nada del proyecto que lo monta; se le
// inyecta la autenticación de ese proyecto.
//   app.use('/api/v1/documentos', crearRouterLecturaDocumentos({ autenticacion: miMiddlewareDeAuth }));
function crearRouterLecturaDocumentos({
  autenticacion,
  logger = console,
  maxPorHora = 60,
  identificar = (req) => req.user?.id || req.ip,
  leer = leerPorDefecto,
} = {}) {
  if (typeof autenticacion !== 'function') throw new Error('crearRouterLecturaDocumentos: falta el middleware de autenticación.');

  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!FORMATOS_IMAGEN.includes(file.mimetype)) return cb(new ErrorLectura(415, 'Formato de imagen no soportado: usa JPG, PNG o WEBP.'));
      cb(null, true);
    },
  }).array('foto', MAX_IMAGENES);

  const MENSAJES_MULTER = {
    LIMIT_FILE_SIZE: 'La foto pesa más de 10 MB.',
    LIMIT_UNEXPECTED_FILE: `Máximo ${MAX_IMAGENES} fotos por documento.`,
  };
  const subir = (req, res, next) => upload(req, res, (err) => {
    if (!err) return next();
    const estado = err.code === 'LIMIT_FILE_SIZE' ? 413 : (err.estado || 400);
    res.status(estado).json({ error: MENSAJES_MULTER[err.code] || err.message });
  });

  router.get('/tipos', autenticacion, (req, res) => {
    res.json(Object.entries(TIPOS).map(([id, t]) => ({ id, etiqueta: t.etiqueta })));
  });

  router.post('/:tipo', autenticacion, crearLimitador(maxPorHora, identificar), subir, async (req, res) => {
    try {
      if (!TIPOS[req.params.tipo]) return res.status(400).json({ error: 'Tipo de documento no soportado.' });
      if (!req.files?.length) return res.status(400).json({ error: 'Falta la foto a leer.' });

      const resultado = await leer({
        imagenes: req.files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype })),
        tipo: req.params.tipo,
      });
      // Solo se registra qué se leyó y quién, nunca los datos personales del documento.
      logger.info?.('Documento leído por IA', { tipo: req.params.tipo, por: identificar(req), tenantId: req.tenantId });
      res.json(resultado);
    } catch (err) {
      logger.error?.('Error al leer documento', { tipo: req.params.tipo, error: err.message });
      res.status(err.estado || 502).json({ error: err.estado ? err.message : 'No se pudo leer el documento. Intenta con una foto más clara.' });
    }
  });

  return router;
}

module.exports = { crearRouterLecturaDocumentos };
