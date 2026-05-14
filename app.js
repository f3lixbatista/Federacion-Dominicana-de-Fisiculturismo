require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { attachUser, checkRole } = require('./middlewares/auth');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.use('/', require('./router/auth'));
app.use('/eventos', require('./router/Eventos'));
app.use('/inscripcion', require('./router/Inscripcion'));
app.use('/atletas', checkRole(['juez', 'admin']), require('./router/Atletas'));
app.use('/categorias', checkRole(['ejecutivo', 'admin']), require('./router/Categoria'));
app.use('/estadisticas', checkRole(['estadistico', 'admin']), require('./router/Estadisticas'));
app.use('/preparadores', require('./router/Preparadores'));
app.use('/', require('./router/rutasBat'));

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
    console.log(`🚀 Servidor FDFF activo en: http://localhost:${port}`);
});
