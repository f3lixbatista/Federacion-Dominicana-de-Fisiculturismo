const { crearRouterLecturaDocumentos } = require('../services/lectorDocumentos');
const { requireAuth } = require('../middlewares/auth');

// Lectura de cédula/pasaporte con IA: cualquier usuario con sesión (la auto-afiliación está abierta
// al rol `general`). El router limita las lecturas por usuario y nunca guarda nada.
module.exports = crearRouterLecturaDocumentos({
    autenticacion: requireAuth,
    identificar: (req) => req.res.locals.user?.id || req.ip,
});
