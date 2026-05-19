const envResult = require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { attachUser, checkRole } = require('./middlewares/auth');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

// Validación preventiva de Variables de Entorno
const variablesRequeridas = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
let faltanVariables = false;

if (envResult.error) {
    console.error(`\x1b[31m%s\x1b[0m`, `❌ ERROR AL CARGAR .ENV:`, envResult.error.message);
}

variablesRequeridas.forEach(v => {
    if (!process.env[v] || process.env[v].trim() === "") {
        console.error(`\x1b[31m%s\x1b[0m`, `❌ ERROR CRÍTICO: La variable ${v} está ausente o vacía.`);
        faltanVariables = true;
    }
});

if (faltanVariables) {
    console.error(`\x1b[33m%s\x1b[0m`, `⚠️ El servidor no puede iniciar sin estas variables. Abortando...`);
    process.exit(1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Inyección global de variables para el cliente (EJS)
app.use((req, res, next) => {
    res.locals.SUPABASE_URL = process.env.SUPABASE_URL;
    res.locals.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    next();
});

app.use(attachUser);

app.use('/', require('./router/auth'));
app.use('/eventos', require('./router/Eventos'));
app.use('/inscripcion', require('./router/Inscripcion'));
app.use('/atletas', require('./router/Atletas'));
app.use('/categorias', checkRole(['ejecutivo', 'admin']), require('./router/Categoria'));
app.use('/estadisticas', checkRole(['estadistico', 'admin']), require('./router/Estadisticas'));
app.use('/preparadores', require('./router/Preparadores'));
app.use('/', require('./router/rutasBat'));

app.use(notFound);
app.use(errorHandler);

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor FDFF activo en el puerto: ${port}`);
});
