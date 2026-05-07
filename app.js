require('dotenv').config();
const express = require('express');
const path = require('path');

const cookieParser = require('cookie-parser');
const { checkRole } = require('./middlewares/auth');

const app = express();
const port = process.env.PORT || 3000;

// 1. Configuración de Vistas y Estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 2. Middlewares para leer datos de formularios y JSON
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));



const supabase = require('./supabaseClient');

app.use(async (req, res, next) => {
    const token = req.cookies['sb-access-token'];
    res.locals.user = null; // Por defecto no hay usuario

    if (token) {
        const { data: { user: authUser } } = await supabase.auth.getUser(token);
        if (authUser) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', authUser.id)
                .single();
            res.locals.user = profile; // Guardamos el perfil (rol y nombre)
        }
    }
    next();
});


// --- RUTAS DE AUTENTICACIÓN ---

app.get('/login', (req, res) => {
    res.render('login');
});

// Callback de Supabase Auth
app.get('/auth/callback', (req, res) => {
    res.render('auth-callback'); 
});

app.get('/reset-password', (req, res) => {
    res.render('reset-password');
});


// --- RUTAS PROTEGIDAS POR ROL ---
// Usamos los nombres exactos de tus archivos en la carpeta /router

// ATLETAS Y JUECES
app.use('/atletas', checkRole(['juez', 'admin']), require('./router/Atletas'));

// EVENTOS Y CATEGORÍAS
app.use('/categorias', checkRole(['ejecutivo', 'admin']), require('./router/Categoria'));

// ESTADÍSTICAS E INSCRIPCIÓN (Pesaje)
app.use('/estadisticas', checkRole(['estadistico', 'admin']), require('./router/Estadisticas'));
app.use('/inscripcion', checkRole(['estadistico', 'admin']), require('./router/Inscripcion'));

// RUTAS GENERALES (Inicio, Noticias, Jueces, Social)
// Estas se manejan dentro de rutasBat.js
app.use('/', require('./router/rutasBat'));

// --- MANEJO DE ERRORES ---

// Middleware para manejar error 404
app.use((req, res, next) => {
    res.status(404).render("404", {
        titulo: "404",
        descripcion: "No existe este sitio Web"
    });
});

// Encendido del servidor
app.listen(port, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${port}`);
    console.log("URL de Supabase configurada:", process.env.SUPABASE_URL);
});
