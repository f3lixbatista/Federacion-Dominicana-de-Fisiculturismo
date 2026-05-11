require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { checkRole } = require('./middlewares/auth');
const supabase = require('./supabaseClient'); // MOVIDO AQUÍ ARRIBA

const app = express();
const port = process.env.PORT || 3000;

// 1. Configuración de Motor y Estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 2. Middlewares de datos (DEBEN IR ANTES DE LAS RUTAS)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// 3. Middleware de SESIÓN GLOBAL
app.use(async (req, res, next) => {
    // Probamos con ambos nombres de cookie por si acaso
    const token = req.cookies['sb-access-token'] || req.cookies['supabase-token'];
    res.locals.user = null;

    if (token) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (user && !error) {
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
            console.error("Error validando sesión:", err.message);
        }
    }
    next();
});

// 4. DEFINICIÓN DE RUTAS (Una sola vez por módulo)

// Autenticación
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        res.cookie('sb-access-token', data.session.access_token, {
            httpOnly: true,
            secure: false, 
            maxAge: 60 * 60 * 24 * 7 * 1000 
        });
        res.redirect('/eventos'); // Sugerencia: Ir directo a eventos
    } catch (error) {
        res.render('login', { error: "Credenciales incorrectas" });
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('sb-access-token');
    res.redirect('/login');
});

// Módulos Principales
app.use('/eventos', require('./router/Eventos'));
app.use('/inscripcion', require('./router/Inscripcion'));
app.use('/atletas', checkRole(['juez', 'admin']), require('./router/Atletas'));
app.use('/categorias', checkRole(['ejecutivo', 'admin']), require('./router/Categoria'));
app.use('/estadisticas', checkRole(['estadistico', 'admin']), require('./router/Estadisticas'));
app.use('/', require('./router/rutasBat'));

// 5. Manejo de Errores
app.use((req, res) => {
    res.status(404).render("404", { titulo: "404", descripcion: "No existe este sitio Web" });
});

app.listen(port, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${port}`);
});
