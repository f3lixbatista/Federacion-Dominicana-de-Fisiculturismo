const notFound = (req, res) => {
    res.status(404).render('404', {
        titulo: '404',
        descripcion: 'Página no encontrada.'
    });
};

// Los formularios con fetch esperan { estado, mensaje }; el resto de las peticiones recibe la página de error.
const pideJson = (req) => {
    const accept = req.get('accept') || '';
    return !!req.is('application/json') || (/json/.test(accept) && !/html/.test(accept));
};

const MENSAJES = {
    413: 'El envío es demasiado grande.',
    400: 'La solicitud no es válida.'
};

const errorHandler = (err, req, res, next) => {
    // Los errores de body-parser (cuerpo grande, JSON roto) traen su propio código 4xx; el resto es un 500.
    const estado = err.status >= 400 && err.status < 500 ? err.status : 500;
    // Se registra dónde ocurrió para poder distinguir un envío legítimo de un sondeo (sin la query: puede llevar secretos).
    console.error(`Error de servidor [${req.method}] ${req.path} (ip ${req.ip}):`, err.message || err);

    if (res.headersSent) return next(err);

    const mensaje = MENSAJES[estado] || (estado < 500 ? 'No se pudo procesar la solicitud.' : 'Ocurrió un error en el servidor.');
    if (pideJson(req)) return res.status(estado).json({ estado: false, mensaje });

    // Con callback para que un fallo al pintar la plantilla nunca llegue al visitante con rutas ni código.
    res.status(estado).render('404', { titulo: estado < 500 ? 'Solicitud no válida' : 'Error interno', descripcion: mensaje }, (errorVista, html) => {
        if (errorVista) {
            console.error('Error al renderizar la página de error:', errorVista.message);
            return res.type('text/plain; charset=utf-8').send(mensaje);
        }
        res.send(html);
    });
};

module.exports = {
    notFound,
    errorHandler
};
