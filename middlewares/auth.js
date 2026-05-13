const { getAuthenticatedUser, getTokenFromRequest } = require('../services/authService');

const attachUser = async (req, res, next) => {
    res.locals.user = null;

    if (req.url.startsWith('/auth/callback')) {
        return next();
    }

    const token = getTokenFromRequest(req);

    if (token) {
        try {
            const user = await getAuthenticatedUser(req);
            if (user) {
                res.locals.user = user;
            }
        } catch (error) {
            console.error('⚠️ Error en procesamiento de sesión:', error.message || error);
        }
    }

    if (!req.url.includes('.')) {
        const status = res.locals.user ? `${res.locals.user.nombre} (${res.locals.user.role})` : 'Invitado';
        console.log(`🌐 [${req.method}] ${req.url} - Usuario: ${status}`);
    }

    next();
};

const requireAuth = (req, res, next) => {
    if (!res.locals.user) {
        return res.redirect('/login');
    }
    next();
};

const checkRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!res.locals.user) {
            return res.redirect('/login');
        }

        const role = res.locals.user.role;
        if (allowedRoles.includes(role) || role === 'admin') {
            return next();
        }

        return res.status(403).render('404', {
            titulo: 'Acceso Denegado',
            descripcion: 'Tu rango actual no permite ver esta sección.'
        });
    };
};

module.exports = {
    attachUser,
    requireAuth,
    checkRole
};
