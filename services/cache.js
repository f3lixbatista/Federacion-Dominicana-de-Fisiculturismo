const NodeCache = require('node-cache');
const appCache = new NodeCache({ useClones: false });

/**
 * Middleware de cache in-memory para rutas EJS.
 * La clave es req.originalUrl (incluye query params).
 * skipFn: (req) => bool — si devuelve true, saltea el cache.
 */
function cacheMiddleware(ttlSeconds, skipFn = null) {
    return (req, res, next) => {
        if (skipFn && skipFn(req)) return next();

        const key = req.originalUrl;
        const cached = appCache.get(key);
        if (cached !== undefined) return res.send(cached);

        const originalRender = res.render.bind(res);
        res.render = (view, locals, callback) => {
            originalRender(view, locals, (err, html) => {
                if (!err) {
                    appCache.set(key, html, ttlSeconds);
                    res.send(html);
                } else {
                    next(err);
                }
            });
        };
        next();
    };
}

/** Invalida todas las claves que empiezan con un prefijo */
function invalidarPrefijo(prefijo) {
    appCache.keys()
        .filter(k => k.startsWith(prefijo))
        .forEach(k => appCache.del(k));
}

module.exports = { appCache, cacheMiddleware, invalidarPrefijo };
