const notFound = (req, res) => {
    res.status(404).render('404', {
        titulo: '404',
        descripcion: 'Página no encontrada.'
    });
};

const errorHandler = (err, req, res, next) => {
    console.error('Error de servidor:', err.message || err);
    res.status(500).render('404', {
        titulo: 'Error interno',
        descripcion: 'Ocurrió un error en el servidor.'
    });
};

module.exports = {
    notFound,
    errorHandler
};
