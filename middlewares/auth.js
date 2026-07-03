const { getAuthenticatedUser, getTokenFromRequest } = require('../services/authService');
const { tienePermiso } = require('../services/permisosService');

const attachUser = async (req, res, next) => {
    res.locals.user = null;

    if (req.url.startsWith('/auth/callback')) {
        return next();
    }

    const token = req.cookies['sb-access-token'] || getTokenFromRequest(req);
    res.locals.ACCESS_TOKEN = token || '';

    if (token) {
        try {
            const user = await getAuthenticatedUser(req);
            if (user) res.locals.user = user;
        } catch (error) {
            console.error('⚠️ Error en procesamiento de sesión:', error.message || error);
        }
    }

    if (!req.url.includes('.')) {
        const status = res.locals.user
            ? `${res.locals.user.nombre} (${res.locals.user.role})`
            : 'Invitado';
        console.log(`🌐 [${req.method}] ${req.url} - Usuario: ${status}`);
    }

    next();
};

const requireAuth = (req, res, next) => {
    if (!res.locals.user) return res.redirect('/login');
    next();
};

// Legado: lista de roles explícita (sigue funcionando en rutas no migradas)
const checkRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!res.locals.user) return res.redirect('/login');
        const role = res.locals.user.role;
        if (allowedRoles.includes(role) || role === 'admin') return next();
        return res.status(403).render('404', {
            titulo: 'Acceso Denegado',
            descripcion: 'Tu rango actual no permite ver esta sección.'
        });
    };
};

/**
 * Middleware dinámico basado en la tabla rol_permisos.
 * Uso: checkPermiso('eventos', 'ver')  |  checkPermiso('atletas', 'editar')
 * El rol 'admin' siempre pasa (cortocircuito en tienePermiso).
 */
const checkPermiso = (area, accion = 'ver') => {
    return (req, res, next) => {
        if (!res.locals.user) return res.redirect('/login');
        const role = res.locals.user.role;
        if (tienePermiso(role, area, accion)) return next();
        return res.status(403).render('404', {
            titulo: 'Acceso Denegado',
            descripcion: `Tu rol no tiene permiso para ${accion} en ${area}.`
        });
    };
};

module.exports = { attachUser, requireAuth, checkRole, checkPermiso };
