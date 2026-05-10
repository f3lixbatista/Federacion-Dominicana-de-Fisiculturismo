require('dotenv').config();
const express = require('express');
const path = require('path');

const cookieParser = require('cookie-parser');
const { checkRole } = require('./middlewares/auth');

const app = express();
const port = process.env.PORT || 3000;
app.use(cookieParser());




// MIDDLEWARE DE SESIÓN GLOBAL
app.use(async (req, res, next) => {
    const token = req.cookies['sb-access-token'];
    res.locals.user = null; // Por defecto, nadie está logueado

    if (token) {
        try {
            // 1. Validamos el token con Supabase (Método seguro)
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (user && !error) {
                // 2. Buscamos el ROL real con el nuevo UUID en la tabla profiles
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, nombre')
                    .eq('id', user.id)
                    .single();

                // 3. Inyectamos los datos para el Navbar y todas las vistas
                res.locals.user = {
                    id: user.id,
                    email: user.email,
                    role: profile?.role || 'general',
                    nombre: profile?.nombre || user.email
                };
            }
        } catch (err) {
            console.error("Error validando sesión:", err.message);
        }
    }
    next();
});




/* app.use(async (req, res, next) => {
    // 1. Extraemos el token de la cookie
    const token = req.cookies['supabase-token'];
    
    if (token) {
        // 2. Validamos el token y obtenemos el usuario
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (user) {
            // 3. Buscamos su rol real en la tabla 'profiles'
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', user.id)
                .single();

            res.locals.user = {
                id: user.id,
                email: user.email,
                role: profile ? profile.role : 'general',
                nombre: profile ? profile.full_name : user.email
            };
        } else {
            res.locals.user = null;
        }
    } else {
        res.locals.user = null;
    }
    next();
});
 */

// 1. Configuración de Vistas y Estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 2. Middlewares para leer datos de formularios y JSON

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));



const supabase = require('./supabaseClient');







// --- RUTAS DE AUTENTICACIÓN ---

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // ESTO ES LO MÁS IMPORTANTE: Guardamos el token en una cookie
        res.cookie('supabase-token', data.session.access_token, {
            httpOnly: true,
            secure: false, // Cambia a true si usas https
            maxAge: 60 * 60 * 24 * 7 * 1000 // 1 semana
        });

        res.redirect('/'); // Al entrar, vamos al inicio y el Navbar ya nos reconocerá
    } catch (error) {
        console.log("Error de login:", error.message);
        res.render('login', { error: "Credenciales incorrectas" });
    }
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

app.get('/afiliacion', checkRole(['general', 'admin']), (req, res) => {
    res.render('afiliacion');
});

// ATLETAS Y JUECES
app.use('/atletas', checkRole(['juez', 'admin']), require('./router/Atletas'));

// EVENTOS Y CATEGORÍAS
app.use('/categorias', checkRole(['ejecutivo', 'admin']), require('./router/Categoria'));

// ESTADÍSTICAS E INSCRIPCIÓN (Pesaje)
app.use('/estadisticas', checkRole(['estadistico', 'admin']), require('./router/Estadisticas'));


// RUTAS GENERALES (Inicio, Noticias, Jueces, Social)
// Estas se manejan dentro de rutasBat.js
app.use('/', require('./router/rutasBat'));

app.use('/inscripcion', require('./router/Inscripcion'));

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
