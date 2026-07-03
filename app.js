const envResult = require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { attachUser, checkRole, checkPermiso } = require('./middlewares/auth');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { supabaseAdmin } = require('./config/supabase');
const { cargarPermisos } = require('./services/permisosService');
const webpush = require('web-push');
const seedCatalogoCategorias = require('./seeds/catalogoCategorias');

const app = express();
const port = process.env.PORT || 3000;

// Validación preventiva de Variables de Entorno
const variablesRequeridas = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL'];
let faltanVariables = false;

// Configuración de Web Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
    webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

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

// Necesario para que las cookies funcionen a través de ngrok / túneles HTTPS
app.set('trust proxy', 1);

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
    res.locals.VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    res.locals.KIOSKO_PIN = process.env.KIOSKO_PIN || '20241234';
    next();
});

app.use(attachUser);

app.get('/logout', (req, res) => {
    // Renderizamos la vista de logout para que el cliente de Supabase 
    // también cierre sesión y limpie el LocalStorage.
    res.render('vistas_auth/logout');
});

// REDIRECCIÓN DE LEGADO: Maneja URLs antiguas para evitar fallos de seguridad (CORS) en el navegador
// REDIRECCIONES DE LEGADO: Maneja URLs antiguas y las normaliza a la nueva estructura por evento
app.get('/votacion', (req, res) => {
    const { evento } = req.query;
    res.redirect(evento ? `/eventos/${evento}/votacion` : '/eventos/competencias');
});

app.get('/dj/consola/:id', (req, res) => res.redirect(`/eventos/${req.params.id}/dj-consola`));
app.get('/admin/recaudacion', (req, res) => {
    const { evento } = req.query;
    res.redirect(evento ? `/eventos/${evento}/recaudacion` : '/eventos/competencias');
});

app.use('/', require('./router/auth'));
app.use('/eventos', require('./router/Eventos'));
app.use('/inscripcion', require('./router/Inscripcion'));
app.use('/categorias', checkPermiso('categorias', 'ver'), require('./router/Categoria'));
app.use('/social', require('./router/Social'));
app.use('/admin', require('./router/Admin'));
app.use('/estadisticas', checkPermiso('estadisticas', 'ver'), require('./router/Estadisticas'));
app.use('/preparadores', require('./router/Preparadores'));
app.use('/dj', require('./router/DJ'));
app.use('/fotografo', require('./router/Fotografo'));
app.use('/atletas', require('./router/Atletas'));
app.use('/', require('./router/rutasBat'));

app.use(notFound);
app.use(errorHandler);

app.listen(port, '0.0.0.0', async () => {
    console.log(`🚀 Servidor FDFF activo en el puerto: ${port}`);

    // Prueba de conexión a Supabase
    try {
        const { data, error } = await supabaseAdmin.from('eventos').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Conexión exitosa a Supabase: Tabla "eventos" accesible.');
    } catch (err) {
        console.error('❌ ERROR DE CONEXIÓN A SUPABASE:', err.message);
    }

    // Carga la matriz de roles y permisos en memoria
    await cargarPermisos();

    // Seed automático del catálogo de disciplinas/divisiones
    await seedCatalogoCategorias();
});
