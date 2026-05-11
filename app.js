require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { checkRole } = require('./middlewares/auth');
const supabase = require('./supabaseClient'); 

const app = express();
const port = process.env.PORT || 3000;

// 1. Configuración de Motor y Estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 2. Middlewares base
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// 3. Middleware de SESIÓN GLOBAL
app.use(async (req, res, next) => {
    // Si estamos en el callback, no validamos aún para dejar que el JS cree la cookie
    if (req.url.startsWith('/auth/callback')) return next();

    const cookieRaw = req.cookies['sb-baovskiienrnihoyufig-auth-token'] || 
                     req.cookies['sb-access-token'] || 
                     req.cookies['supabase-token'];
    
    res.locals.user = null;

    if (cookieRaw) {
        try {
            let token = cookieRaw;
            
            // Supabase a veces envía la cookie como un objeto JSON stringificado
            if (typeof cookieRaw === 'string' && cookieRaw.startsWith('{')) {
                const sessionData = JSON.parse(cookieRaw);
                token = sessionData.access_token || token;
            }

            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (user && !authError) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, nombre')
                    .eq('id', user.id)
                    .single();

                res.locals.user = {
                    id: user.id,
                    email: user.email,
                    role: profile?.role || 'general',
                    nombre: profile?.nombre || user.email
                };
            }
        } catch (err) {
            console.log("⚠️ Error en procesamiento de sesión:", err.message);
        }
    }

    // Log de navegación limpio
    if (!req.url.includes('.')) {
        const status = res.locals.user ? `${res.locals.user.nombre} (${res.locals.user.role})` : 'Invitado';
        console.log(`🌐 [${req.method}] ${req.url} - Usuario: ${status}`);
    }
    next();
});

// 4. DEFINICIÓN DE RUTAS

// Autenticación básica
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        res.cookie('sb-access-token', data.session.access_token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 * 1000 
        });
        
        console.log(`✅ Login exitoso para: ${email}`);
        res.redirect('/eventos'); 
    } catch (error) {
        console.log("❌ Error de login:", error.message);
        res.render('login', { error: "Correo o contraseña incorrectos" });
    }
});

// Ruta especial para el callback de Google/OAuth
app.get('/auth/callback', (req, res) => {
    res.render('auth-callback', { user: null });
});

app.get('/logout', (req, res) => {
    res.clearCookie('sb-access-token');
    res.clearCookie('sb-baovskiienrnihoyufig-auth-token');
    res.redirect('/login');
});

// Módulos del Sistemanpm
app.use('/eventos', require('./router/Eventos'));
app.use('/inscripcion', require('./router/Inscripcion'));
app.use('/atletas', checkRole(['juez', 'admin']), require('./router/Atletas'));
app.use('/categorias', checkRole(['ejecutivo', 'admin']), require('./router/Categoria'));
app.use('/estadisticas', checkRole(['estadistico', 'admin']), require('./router/Estadisticas'));
app.use('/', require('./router/rutasBat'));

// 5. Manejo de Errores (404)
app.use((req, res) => {
    res.status(404).render("404", { 
        titulo: "404", 
        descripcion: "Página no encontrada." 
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor FDFF activo en: http://localhost:${port}`);
});
